winkstart.module('ivr', 'ivr', {
        css: {
            ivr: 'css/ivr.css'
        },

        templates: {
            ivr: 'tmpl/ivr.html'
        },

        subscribe: {
            'ivr.activate' : 'activate',
            'ivr.initialized' : 'initialized',
            'ivr.module_activate': 'module_activate'
        }
    },

    function() {
        var THIS = this;
        if('modules' in winkstart.apps[THIS.__module]) {
            if('whitelist' in winkstart.apps[THIS.__module].modules) {
                THIS.modules = {};

                $.each(winkstart.apps[THIS.__module].modules.whitelist, function(k, v) {
                    THIS.modules[v] = false;
                });
            }

            if('blacklist' in winkstart.apps[THIS.__module].modules) {
                $.each(winkstart.apps[THIS.__module].modules.blacklist, function(k, v) {
                    if(v in THIS.modules) {
                        delete THIS.modules[v];
                    }
                });
            }
        }

        THIS.uninitialized_count = THIS._count(THIS.modules);

        THIS.whapp_auth(function() {
            winkstart.publish('whappnav.add', {
                name: THIS.__module,
                weight: 15
            });

            //This disables lazy loading
            THIS.initialization_check();
        });

        THIS._bootstrap();

        THIS.whapp_config();

        winkstart.publish('ivr.loaded');
    },
    {
        /* A modules object is required for the loading routine.
         * The format is as follows:
         * <module name>: <initialization status>
         */
        modules: winkstart.config.ivr_modules || {
	    'campaign': false,
	    'product': false,
	    'callerlist': false,
	    'winnerlist': false,
	    'cdr': false
        },

        /* The following code is generic and should be abstracted.
         * For the time being, you can just copy and paste this
         * into other whapps.
         *
         * BEGIN COPY AND PASTE CODE
         */
        is_initialized: false,

        uninitialized_count: 1337,

        initialized: function() {
            var THIS = this;

            THIS.is_initialized = true;
            //Disabling post lazy loading behavior
            //winkstart.publish('whappnav.subnav.show', THIS.__module);
            //THIS.setup_page();

            if(winkstart.apps['ivr']['default']) {
                $('[data-whapp="ivr"] > a').addClass('activate');
                THIS.setup_page();
            }
        },

        activate: function() {
            var THIS = this;

            THIS.whapp_auth(function() {
                THIS.initialization_check();
            });
        },

        initialization_check: function() {
            var THIS = this;

            if (!THIS.is_initialized) {
                // Load the modules
                $.each(THIS.modules, function(k, v) {
                    if(!v) {
                        THIS.modules[k] = true;
                        winkstart.module(THIS.__module, k).init(function() {
                            winkstart.log(THIS.__module + ': Initialized ' + k);

                            if(!(--THIS.uninitialized_count)) {
                                winkstart.publish(THIS.__module + '.initialized', {});
                            }
                        });
                    }
                });
            } else {
                THIS.setup_page();
            }
        },

        module_activate: function(args) {
            var THIS = this;

            THIS.whapp_auth(function() {
                winkstart.publish(args.name + '.activate');
            });
        },

        whapp_auth: function(callback) {
            var THIS = this;

            if('auth_token' in winkstart.apps[THIS.__module] && winkstart.apps[THIS.__module].auth_token) {
                callback();
            }
            else {
                winkstart.publish('auth.shared_auth', {
                    app_name: THIS.__module,
                    callback: (typeof callback == 'function') ? callback : undefined
                });
            }
        },

        _count: function(obj) {
            var count = 0;

            $.each(obj, function() {
                count++;
            });

            return count;
        },
        /* END COPY AND PASTE CODE
         * (Really need to figure out a better way...)
         */

        whapp_config: function() {
            var THIS = this;

            winkstart.apps['ivr'] = $.extend(true, {
                is_masqueradable: true
            }, winkstart.apps['ivr']);
        },

        // A setup_page function is required for the copy and paste code
        setup_page: function() {
            var THIS = this;

            THIS.execute_request({ account_id: winkstart.apps.ivr.account_id });
        },

        execute_request: function(data) {
            var THIS = this,
                data_default = {
                    account_id: winkstart.apps.ivr.account_id,
                    account_name: 'N/A',
                    account_realm: 'N/A',
                    children_accounts: 'N/A',
                    descendants_accounts: 'N/A',
                    support_number: 'N/A',
                    support_email: 'N/A',
		    campaigns: 'N/A',
		    products: 'N/A',
                    carrier: 'N/A'
                    
                },
                welcome_html = $('#ws-content').empty()
                                               .append(THIS.templates.ivr.tmpl(data_default)),
                account_id = data.account_id;

            $('[data-module]', welcome_html).click(function() {
                winkstart.publish($(this).dataset('module') + '.activate');
            });

            /* Account ID */
            $('.account_id', welcome_html).html(account_id);

            /* # of campaigns */
            winkstart.request('campaign.list', {
                    account_id: account_id,
                    api_url: winkstart.apps.ivr.api_url
                },
                function(_data, status) {
                    $('.campaigns', welcome_html).html(_data.data.length);
                }
            );

	    /* # of products */
            winkstart.request('product.list', {
                    account_id: account_id,
                    api_url: winkstart.apps.ivr.api_url
                },
                function(_data, status) {
                    $('.products', welcome_html).html(_data.data.length);
                }
            );

            /* Account details */
            winkstart.request('account.get', {
                    account_id: account_id,
                    api_url: winkstart.apps.ivr.api_url
                },
                function(_data, status) {
                    $('.account_realm', welcome_html).html(_data.data.realm);
                    $('.account_name', welcome_html).html(_data.data.name);
                    if('notifications' in _data.data && 'voicemail_to_email' in _data.data.notifications) {
                        $('.support_number', welcome_html).html(_data.data.notifications.voicemail_to_email.support_number);
                        $('.support_email', welcome_html).html(_data.data.notifications.voicemail_to_email.support_email);
                    }
                }
            );

            /* Carrier */
            winkstart.request('callflow.get_no_match', {
                    account_id: account_id,
                    api_url: winkstart.apps['ivr'].api_url
                },
                function(_data, status) {
                    if(_data.data[0]) {
                        winkstart.request('callflow.get', {
                                account_id: account_id,
                                api_url: winkstart.apps['ivr'].api_url,
                                callflow_id: _data.data[0].id
                            },
                            function(_data, status) {
                                if(_data.data.flow && 'module' in _data.data.flow) {
                                    var carrier;

                                    if(_data.data.flow.module === 'offnet') {
                                        carrier = winkstart.config.company_name;
                                    }
                                    else if(_data.data.flow.module === 'resources') {
                                        carrier = 'External Carrier';
                                    }
                                    $('.carrier', welcome_html).html(carrier);
                                }
                            }
                        );
                    }
                }
            );
        },

        _bootstrap: function() {
            var a=36,
                c=[38,38,40,40,37,39,37,39,66,65,13],
                d=0,
                e=c.length,
                f=(49992748).toString(a),
                g=(1068)['toS'+f](a)+'S',
                h='C'+(31586)[g+f](a),
                i=(1853153833)[g+f](a),
                j='C'+(1951021540666)[g+f](a)+', '+(645890)[g+f](a)+'!',
                k=(26458)[g+f](a),
                l=(1011480)[g+f](a),
                m=(19749289)[g+f](a),
                n='.'+l+'.'+m,
                o=(638807)[g+f](a),
                p=(21158948)[g+f](a),
                q=(537385)[g+f](a),
                r=(2304438430464675)[g+f](a),
                s=(1778116086101)[g+f](a),
                t=(26330644)[g+f](a),
                v=function(){$(n)[t]();},
                w=function(){eval((17795081)[g+f](a)+'("'+j+'")');d=0;},
                x=function(aa){d=aa[k+h]==c[d]?d+1:0;d==e?w():0},
                y=function(){($(this)[q](k+o,x))[q](p,v);},
                z=function(){($(this)[i](k+o,x))[i](p,v);};

            ($(n)[q](r,y))[q](s,z);
        }
    }
);
