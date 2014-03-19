winkstart.module('ivr', 'campaign', {
        css: [
            'css/style.css'
        ],

        templates: {
            campaign: 'tmpl/campaign.html',
            edit: 'tmpl/edit.html',
            product_row: 'tmpl/product_row.html'
        },

        subscribe: {
            'campaign.activate': 'activate',
            'campaign.edit': 'edit_campaign',
            'callflow.define_callflow_nodes': 'define_callflow_nodes',
            'campaign.popup_edit': 'popup_edit_campaign'
        },

        validation: [{
            name: '#campaign_name',
            regex: /^.+$/
        }, {
            name: '#campaign_description',
            regex: /^.+$/
        }, {
            name: '#winner_no',
            regex: /^[0-9\-]{1,10}$/
        }],

        resources: {
            'campaign.list': {
                url: '{api_url}/accounts/{account_id}/campaigns',
                contentType: 'application/json',
                verb: 'GET'
            },
            'campaign.list_no_loading': {
                url: '{api_url}/accounts/{account_id}/campaigns',
                contentType: 'application/json',
                verb: 'GET',
                trigger_events: false
            },
            'campaign.get': {
                url: '{api_url}/accounts/{account_id}/campaigns/{campaign_id}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'campaign.create': {
                url: '{api_url}/accounts/{account_id}/campaigns',
                contentType: 'application/json',
                verb: 'PUT'
            },
            'campaign.update': {
                url: '{api_url}/accounts/{account_id}/campaigns/{campaign_id}',
                contentType: 'application/json',
                verb: 'POST'
            },
            'campaign.delete': {
                url: '{api_url}/accounts/{account_id}/campaigns/{campaign_id}',
                contentType: 'application/json',
                verb: 'DELETE'
            },
            'campaign.product_list': {
                url: '{api_url}/accounts/{account_id}/products?filter_campaign_id={campaign_id}',
                contentType: 'application/json',
                verb: 'GET',
                trigger_events: false
            },
            'campaign.product_new_campaign': {
                url: '{api_url}/accounts/{account_id}/products?filter_new_campaign={campaign_id}',
                contentType: 'application/json',
                verb: 'GET',
                trigger_events: false
            },
            'callflow.list': {
                url: '{api_url}/accounts/{account_id}/callflows',
                contentType: 'application/json',
                verb: 'GET'
            },
            'campaign.account_get': {
                url: '{api_url}/accounts/{account_id}',
                contentType: 'application/json',
                verb: 'GET'
            },
        }
    },

    function (args) {
        var THIS = this;

        winkstart.registerResources(THIS.__whapp, THIS.config.resources);

        winkstart.publish('whappnav.subnav.add', {
            whapp: 'ivr',
            module: this.__module,
            label: 'Campaigns',
            icon: 'conference',
            weight: '05',
        });
    },

    {
        random_id: false,

        save_campaign: function (form_data, data, success, error) {
            var THIS = this,
                normalized_data = THIS.normalize_data($.extend(true, {}, data.data, form_data));

            if (typeof data.data == 'object' && data.data.id) {
                winkstart.request(true, 'campaign.update', {
                        account_id: winkstart.apps['ivr'].account_id,
                        api_url: winkstart.apps['ivr'].api_url,
                        campaign_id: data.data.id,
                        data: normalized_data
                    },
                    function (_data, status) {
                        if (typeof success == 'function') {
                            success(_data, status, 'update');
                        }
                    },
                    function (_data, status) {
                        if (typeof error == 'function') {
                            error(_data, status, 'update');
                        }
                    }
                );
            } else {
                winkstart.request(true, 'campaign.create', {
                        account_id: winkstart.apps['ivr'].account_id,
                        api_url: winkstart.apps['ivr'].api_url,
                        data: normalized_data
                    },
                    function (_data, status) {
                        if (typeof success == 'function') {
                            success(_data, status, 'create');
                        }
                    },
                    function (_data, status) {
                        if (typeof error == 'function') {
                            error(_data, status, 'create');
                        }
                    }
                );
            }
        },

        acquire_product: function (campaign_data, success, error) {
            var THIS = this,
                campaign_id = campaign_data.data.id;

            if (THIS.random_id) {
                winkstart.request(true, 'campaign.product_new_campaign', {
                        account_id: winkstart.apps['ivr'].account_id,
                        api_url: winkstart.apps['ivr'].api_url,
                        campaign_id: THIS.random_id
                    },
                    function (_data, status) {
                        var product_id;
                        var array_length = _data.data.length;
                        if (array_length != 0) {
                            $.each(_data.data, function (k, v) {
                                product_id = this.id;
                                winkstart.request(false, 'product.get', {
                                        account_id: winkstart.apps['ivr'].account_id,
                                        api_url: winkstart.apps['ivr'].api_url,
                                        product_id: product_id
                                    },
                                    function (_data, status) {
                                        _data.data.campaign_id = campaign_id;
                                        delete _data.data.new_campaign;
                                        winkstart.request(false, 'product.update', {
                                                account_id: winkstart.apps['ivr'].account_id,
                                                api_url: winkstart.apps['ivr'].api_url,
                                                product_id: _data.data.id,
                                                data: _data.data
                                            },
                                            function (_data, status) {
                                                if (k == array_length - 1) {
                                                    success({}, status, 'create');
                                                }
                                            }
                                        );
                                    }
                                );
                            });
                        } else {
                            success({}, status, 'create');
                        }
                    }
                );
            } else {
                success({}, status, 'create');
            }
        },

        edit_campaign: function (data, _parent, _target, _callbacks, data_defaults) {
            var THIS = this,
                parent = _parent || $('#campaign-content'),
                target = _target || $('#campaign-view', parent),
                _callbacks = _callbacks || {},
                callbacks = {
                    save_success: _callbacks.save_success || function (_data) {
                        THIS.render_list(parent);

                        THIS.edit_campaign({
                            id: _data.data.id
                        }, parent, target, callbacks);
                    },

                    save_error: _callbacks.save_error,

                    delete_success: _callbacks.delete_success || function () {
                        target.empty();

                        THIS.render_list(parent);
                    },

                    delete_error: _callbacks.delete_error,

                    after_render: _callbacks.after_render
                },
                defaults = {
                    data: $.extend(true, {
                        member: {}
                    }, data_defaults || {}),
                    field_data: {
                        products: []
                    }
                };
            THIS.random_id = false;

            winkstart.parallel({
                    callflow_list: function (callback) {
                        winkstart.request(true, 'callflow.list', {
                                account_id: winkstart.apps['ivr'].account_id,
                                api_url: winkstart.apps['ivr'].api_url
                            },
                            function (_data, status) {
                                _data.data.unshift({
                                    id: '',
                                    first_name: '- No',
                                    last_name: 'owner -'
                                });

                                defaults.field_data.callflows = _data.data;

                                callback(null, _data);
                            }
                        );
                    },
                    campaign_get: function (callback) {
                        if (typeof data == 'object' && data.id) {
                            winkstart.request(true, 'campaign.get', {
                                    account_id: winkstart.apps['ivr'].account_id,
                                    api_url: winkstart.apps['ivr'].api_url,
                                    campaign_id: data.id
                                },
                                function (_data, status) {
                                    //  THIS.migrate_data(_data);
                                    THIS.format_data(_data);
                                    callback(null, _data);
                                }
                            );
                        } else {
                            THIS.random_id = $.md5(winkstart.random_string(10) + new Date().toString());
                            defaults.field_data.new_campaign = THIS.random_id;

                            callback(null, defaults);
                        }
                    },
                },
                function (err, results) {
                    var render_data = defaults;
                    if (typeof data === 'object' && data.id) {
                        render_data = $.extend(true, defaults, results.campaign_get);
                    }

                    THIS.render_campaign(render_data, target, callbacks);

                    if (typeof callbacks.after_render == 'function') {
                        callbacks.after_render();
                    }
                });
        },

        delete_campaign: function (data, success, error) {
            var THIS = this;

            if (typeof data.data == 'object' && data.data.id) {
                winkstart.request(true, 'campaign.delete', {
                        account_id: winkstart.apps['ivr'].account_id,
                        api_url: winkstart.apps['ivr'].api_url,
                        campaign_id: data.data.id
                    },
                    function (_data, status) {
                        if (typeof success == 'function') {
                            success(_data, status);
                        }
                    },
                    function (_data, status) {
                        if (typeof error == 'function') {
                            error(_data, status);
                        }
                    }
                );
            }
        },

        render_campaign: function (data, target, callbacks) {
            var THIS = this,
                campaign_html = THIS.templates.edit.tmpl(data),
                data_products;

            THIS.render_product_list(data, campaign_html);

            winkstart.validate.set(THIS.config.validation, campaign_html);

            winkstart.timezone.populate_dropdown($('#timezone', campaign_html), data.data.timezone);

            if (data.data.id === winkstart.apps['ivr'].campaign_id) {
                $('.campaign-delete', campaign_html).hide();
            }

            $('*[rel=popover]:not([type="text"])', campaign_html).popover({
                trigger: 'hover'
            });

            $('*[rel=popover][type="text"]', campaign_html).popover({
                trigger: 'focus'
            });

            winkstart.tabs($('.view-buttons', campaign_html), $('.tabs', campaign_html));
            winkstart.link_form(campaign_html);

            $('.campaign-save', campaign_html).click(function (ev) {
                ev.preventDefault();

                winkstart.validate.is_valid(THIS.config.validation, campaign_html, function () {
                        var form_data = form2object('campaign-form');

                        if ('field_data' in data) {
                            delete data.field_data;
                        }

                        THIS.save_campaign(form_data, data, callbacks.save_success, winkstart.error_message.process_error(callbacks.save_error));
                    },
                    function () {
                        winkstart.alert('There were errors on the form, please correct!');
                    }
                );
            });

            $('.campaign-delete', campaign_html).click(function (ev) {
                ev.preventDefault();

                winkstart.confirm('Are you sure you want to delete this campaign?', function () {
                    THIS.delete_campaign(data, callbacks.delete_success, callbacks.delete_error);
                });
            });

            $(campaign_html).delegate('.action_product.edit', 'click', function () {
                var data_product = {
                    id: $(this).dataset('id'),
                    hide_campaign: !data.data.id ? true : false
                };

                var defaults = {};

                if (!data.data.id) {
                    defaults.new_campaign = THIS.random_id;
                } else {
                    defaults.campaign_id = data.data.id;
                }

                winkstart.publish('product.popup_edit', data_product, function (_data) {
                    data_products = {
                        data: {},
                        field_data: {
                            // product_types: data.field_data.product_types
                        }
                    };
                    data_products.data = _data.data.new_campaign ? {
                        new_campaign: true,
                        id: THIS.random_id
                    } : {
                        id: data.data.id
                    };

                    THIS.render_product_list(data_products, campaign_html);
                }, defaults);
            });

            $(campaign_html).delegate('.action_product.delete', 'click', function () {
                var product_id = $(this).dataset('id');
                winkstart.confirm('Do you really want to delete this product?', function () {
                    winkstart.request(true, 'product.delete', {
                            account_id: winkstart.apps['ivr'].account_id,
                            api_url: winkstart.apps['ivr'].api_url,
                            product_id: product_id
                        },
                        function (_data, status) {
                            data_products = {
                                data: {},
                                field_data: {
                                    //  product_types: data.field_data.product_types
                                }
                            };
                            data_products.data = THIS.random_id ? {
                                new_campaign: true,
                                id: THIS.random_id
                            } : {
                                id: data.data.id
                            };

                            THIS.render_product_list(data_products, campaign_html);
                        }
                    );
                });
            });

            $('.add_product', campaign_html).click(function (ev) {
                var data_product = {
                    hide_campaign: true
                },
                    defaults = {};

                ev.preventDefault();

                if (!data.data.id) {
                    defaults.new_campaign = THIS.random_id;
                } else {
                    defaults.campaign_id = data.data.id;
                }

                winkstart.publish('product.popup_edit', data_product, function (_data) {
                    var data_products = {
                        data: {},
                        field_data: {
                            //  product_types: data.field_data.product_types
                        }
                    };
                    data_products.data = THIS.random_id ? {
                        new_campaign: true,
                        id: THIS.random_id
                    } : {
                        id: data.data.id
                    };

                    THIS.render_product_list(data_products, campaign_html);
                }, defaults);
            });

            (target)
                .empty()
                .append(campaign_html);
        },

        render_product_list: function (data, parent) {
            var THIS = this,
                parent = $('#tab_products', parent);

            if (data.data.id) {
                var request_string = data.data.new_campaign ? 'campaign.product_new_campaign' : 'campaign.product_list';

                winkstart.request(true, request_string, {
                        account_id: winkstart.apps['ivr'].account_id,
                        api_url: winkstart.apps['ivr'].api_url,
                        campaign_id: data.data.id
                    },
                    function (_data, status) {
                        $('.rows', parent).empty();
                        if (_data.data.length > 0) {
                            $.each(_data.data, function (k, v) {
                                v.not_enabled = this.enabled === false ? true : false;
                                $('.rows', parent).append(THIS.templates.product_row.tmpl(v));
                            });
                        } else {
                            $('.rows', parent).append(THIS.templates.product_row.tmpl());
                        }
                    }
                );
            } else {
                $('.rows', parent).empty().append(THIS.templates.product_row.tmpl());
            }
        },

        format_data: function (data) {
            if (typeof data.data.member == 'object') {
                if ($.isArray(data.data.description)) {
                    data.data.description_string = data.data.description.join(', ');
                }
            }

            return data;
        },

        normalize_data: function (data) {
            if (!data.campaign_description.length) {
                delete data.campaign_description;
            }

            if (!data.campaign_name.length) {
                delete data.campaign_name;
            }

            if (!data.winner_no.length) {
                delete data.winner_no;
            }

            delete data.campaign_description_string;
            delete data.campaign_name_string;
            delete data.winner_no_string;

            return data;
        },

        render_list: function (parent) {
            var THIS = this;

            winkstart.request(true, 'campaign.list', {
                    account_id: winkstart.apps['ivr'].account_id,
                    api_url: winkstart.apps['ivr'].api_url
                },
                function (data, status) {
                    var map_crossbar_data = function (data) {
                        var new_list = [];

                        if (data.length > 0) {
                            $.each(data, function (key, val) {
                                new_list.push({
                                    id: val.id,
                                    title: val.campaign_name || '(no name)'
                                });
                            });
                        }

                        new_list.sort(function (a, b) {
                            return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
                        });

                        return new_list;
                    };

                    $('#campaign-listpanel', parent)
                        .empty()
                        .listpanel({
                            label: 'Campaigns',
                            identifier: 'campaign-listview',
                            new_entity_label: 'Add Campaign',
                            data: map_crossbar_data(data.data),
                            publisher: winkstart.publish,
                            notifyMethod: 'campaign.edit',
                            notifyCreateMethod: 'campaign.edit',
                            notifyParent: parent
                        });
                }
            );
        },

        activate: function (parent) {
            var THIS = this,
                campaign_html = THIS.templates.campaign.tmpl();

            (parent || $('#ws-content'))
                .empty()
                .append(campaign_html);

            THIS.render_list(campaign_html);
        },

        popup_edit_campaign: function (data, callback, data_defaults) {
            var popup, popup_html;

            popup_html = $('<div class="inline_popup"><div class="inline_content main_content"/></div>');

            popup_html.css({
                height: 500,
                'overflow-y': 'scroll'
            });

            winkstart.publish('campaign.edit', data, popup_html, $('.inline_content', popup_html), {
                save_success: function (_data) {
                    popup.dialog('close');

                    if (typeof callback == 'function') {
                        callback(_data);
                    }
                },
                delete_success: function () {
                    popup.dialog('close');

                    if (typeof callback == 'function') {
                        callback({
                            data: {}
                        });
                    }
                },
                after_render: function () {
                    popup = winkstart.dialog(popup_html, {
                        title: (data.id) ? 'Edit Campaign' : 'Create Campaign'
                    });
                }
            }, data_defaults);
        }
    }
);
