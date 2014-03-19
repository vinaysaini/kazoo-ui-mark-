winkstart.module('voip', 'logic', {
        css: [
            'css/logic.css'
        ],

        templates: {
            logic: 'tmpl/logic.html',
            edit: 'tmpl/edit.html',
            logic_callflow: 'tmpl/logic_callflow.html',
            logic_key_callflow: 'tmpl/logic_key_callflow.html'
        },

        subscribe: {
            'logic.activate': 'activate',
            'logic.edit': 'edit_logic',
            'callflow.define_callflow_nodes': 'define_callflow_nodes',
            'logic.popup_edit': 'popup_edit_logic'
        },

        validation: [
            { name: '#name',                 regex: /^.*/ },
            { name: '#voice_uri',            regex: /^.*/ }
        ],

        resources: {
            'logic.list': {
                url: '{api_url}/accounts/{account_id}/logics',
                contentType: 'application/json',
                verb: 'GET'
            },
            'logic.list_no_loading': {
                url: '{api_url}/accounts/{account_id}/logics',
                contentType: 'application/json',
                verb: 'GET',
                trigger_events: false
            },
            'logic.get': {
                url: '{api_url}/accounts/{account_id}/logics/{logic_id}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'logic.create': {
                url: '{api_url}/accounts/{account_id}/logics',
                contentType: 'application/json',
                verb: 'PUT'
            },
            'logic.update': {
                url: '{api_url}/accounts/{account_id}/logics/{logic_id}',
                contentType: 'application/json',
                verb: 'POST'
            },
            'logic.delete': {
                url: '{api_url}/accounts/{account_id}/logics/{logic_id}',
                contentType: 'application/json',
                verb: 'DELETE'
            }
        }
    },

    function(args) {
        var THIS = this;

        winkstart.registerResources(THIS.__whapp, THIS.config.resources);

        //winkstart.publish('statistics.add_stat', THIS.define_stats());

        winkstart.publish('whappnav.subnav.add', {
            whapp: 'voip',
            module: THIS.__module,
            label: 'Logics',
            icon: 'logic1',
            weight: '40',
            category: 'advanced'
        });
    },

    {
        save_logic: function(form_data, data, success, error) {
            var THIS = this,
                normalized_data = THIS.normalize_data($.extend(true, {}, data.data, form_data));

            if (typeof data.data == 'object' && data.data.id) {
                winkstart.request(true, 'logic.update', {
                        account_id: winkstart.apps['voip'].account_id,
                        api_url: winkstart.apps['voip'].api_url,
                        logic_id: data.data.id,
                        data: normalized_data
                    },
                    function(_data, status) {
                        if(typeof success == 'function') {
                            success(_data, status, 'update');
                        }
                    },
                    function(_data, status) {
                        if(typeof error == 'function') {
                            error(_data, status, 'update');
                        }
                    }
                );
            }
            else {
                winkstart.request(true, 'logic.create', {
                        account_id: winkstart.apps['voip'].account_id,
                        api_url: winkstart.apps['voip'].api_url,
                        data: normalized_data
                    },
                    function (_data, status) {
                        if(typeof success == 'function') {
                            success(_data, status, 'create');
                        }
                    },
                    function(_data, status) {
                        if(typeof error == 'function') {
                            error(_data, status, 'update');
                        }
                    }

                );
            }
        },

        edit_logic: function(data, _parent, _target, _callbacks, data_defaults){
            var THIS = this,
                parent = _parent || $('#logic-content'),
                target = _target || $('#logic-view', parent),
                _callbacks = _callbacks || {},
                callbacks = {
                    save_success: _callbacks.save_success || function(_data) {
                        THIS.render_list(parent);

                        THIS.edit_logic({ id: _data.data.id }, parent, target, callbacks);
                    },

                    save_error: _callbacks.save_error,

                    delete_success: _callbacks.delete_success || function() {
                        target.empty();

                        THIS.render_list(parent);
                    },

                    delete_error: _callbacks.delete_error,

                    after_render: _callbacks.after_render
                }, 
				defaults = {
					 data: $.extend(true, {}, data_defaults || {}),
                    field_data: {}
                };

            winkstart.parallel({
                    logic_get: function(callback) {
                        if(typeof data == 'object' && data.id) {
                            winkstart.request(true, 'logic.get', {
                                    account_id: winkstart.apps['voip'].account_id,
                                    api_url: winkstart.apps['voip'].api_url,
                                    logic_id: data.id
                                },
                                function(_data, status) {

                                    callback(null, _data);
                                }
                            );
                        }
                        else {
                            callback(null, {});
                        }
                    }
                },
                function(err, results) {
                    var render_data = defaults;

                    if(typeof data === 'object' && data.id) {
                        render_data = $.extend(true, defaults, results.logic_get)
                    }

                    THIS.render_logic(render_data, target, callbacks);

                    if(typeof callbacks.after_render == 'function') {
                        callbacks.after_render();
                    }
                }
            );
        },

        delete_logic: function(data, success, error) {
            var THIS = this;

            if(typeof data.data == 'object' && data.data.id) {
                winkstart.request(true, 'logic.delete', {
                        account_id: winkstart.apps['voip'].account_id,
                        api_url: winkstart.apps['voip'].api_url,
                        logic_id: data.data.id
                    },
                    function(_data, status) {
                        if(typeof success == 'function') {
                            success(_data, status);
                        }
                    },
                    function(_data, status) {
                        if(typeof error == 'function') {
                            error(_data, status);
                        }
                    }
                );
            }
        },

        render_logic: function(data, target, callbacks){
            var THIS = this,
                logic_html = THIS.templates.edit.tmpl(data);

            winkstart.validate.set(THIS.config.validation, logic_html);

            $('*[rel=popover]:not([type="text"])', logic_html).popover({
                trigger: 'hover'
            });

            $('*[rel=popover][type="text"]', logic_html).popover({
                trigger: 'focus'
            });

            winkstart.tabs($('.view-buttons', logic_html), $('.tabs', logic_html));

            $('.logic-save', logic_html).click(function(ev) {
                ev.preventDefault();

                winkstart.validate.is_valid(THIS.config.validation, logic_html, function() {
                        var form_data = form2object('logic-form');

                        THIS.clean_form_data(form_data);

                        if('field_data' in data) {
                            delete data.field_data;
                        }

                        THIS.save_logic(form_data, data, callbacks.save_success, winkstart.error_message.process_error(callbacks.save_error));
                    },
                    function() {
                        winkstart.alert('There were errors on the form, please correct!');
                    }
                );
            });

            $('.logic-delete', logic_html).click(function(ev) {
                ev.preventDefault();

                winkstart.confirm('Are you sure you want to delete this logic?', function() {
                    THIS.delete_logic(data, callbacks.delete_success, callbacks.delete_error);
                });
            });

            (target)
                .empty()
                .append(logic_html);
        },

        normalize_data: function(form_data) {
            if(form_data.voice_uri == '') {
                delete form_data.voice_uri;
            }

            return form_data;
        },


        clean_form_data: function(form_data) {

        },

        render_list: function(_parent){
            var THIS = this,
                parent = _parent || $('#logic-content');;

            winkstart.request(true, 'logic.list', {
                    account_id: winkstart.apps['voip'].account_id,
                    api_url: winkstart.apps['voip'].api_url
                },
                function (data, status) {
                    var map_crossbar_data = function(data) {
                       var new_list = [];

                        if(data.length > 0) {
                            $.each(data, function(key, val) {
                                new_list.push({
                                    id: val.id,
                                    title: val.name || '(no name)'
                                });
                            });
                        }

                        new_list.sort(function(a, b) {
                            return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
                        });

                        return new_list;
                    };

                    $('#logic-listpanel', parent)
                        .empty()
                        .listpanel({
                            label: 'Logics',
                            identifier: 'logic-listview',
                            new_entity_label: 'Add Logic',
                            data: map_crossbar_data(data.data),
                            publisher: winkstart.publish,
                            notifyMethod: 'logic.edit',
                            notifyCreateMethod: 'logic.edit',
                            notifyParent: parent
                        });
                }
            );
        },

        activate: function(parent) {
            var THIS = this,
                logic_html = THIS.templates.logic.tmpl();

            (parent || $('#ws-content'))
                .empty()
                .append(logic_html);

            THIS.render_list(logic_html);
        },

        popup_edit_logic: function(data, callback, data_defaults) {
            var popup, popup_html;

            popup_html = $('<div class="inline_popup"><div class="inline_content main_content"/></div>');

            winkstart.publish('logic.edit', data, popup_html, $('.inline_content', popup_html), {
                save_success: function(_data) {
                    popup.dialog('close');

                    if(typeof callback == 'function') {
                        callback(_data);
                    }
                },
                delete_success: function() {
                    popup.dialog('close');

                    if(typeof callback == 'function') {
                        callback({ data: {} });
                    }
                },
                after_render: function() {
                    popup = winkstart.dialog(popup_html, {
                        title: (data.id) ? 'Edit Logic' : 'Create Logic'
                    });
                }
            }, data_defaults);
        },

        define_stats: function() {
            var stats = {
                'logics': {
                    icon: 'logic1',
                    get_stat: function(callback) {
                        winkstart.request('logic.list_no_loading', {
                                account_id: winkstart.apps['voip'].account_id,
                                api_url: winkstart.apps['voip'].api_url
                            },
                            function(_data, status) {
                                var stat_attributes = {
                                    name: 'logics',
                                    number: _data.data.length,
                                    active: _data.data.length > 0 ? true : false,
                                    color: _data.data.length < 1 ? 'red' : (_data.data.length > 1 ? 'green' : 'orange')
                                };
                                if(typeof callback === 'function') {
                                    callback(stat_attributes);
                                }
                            },
                            function(_data, status) {
                                callback({error: true});
                            }
                        );
                    },
                    click_handler: function() {
                        winkstart.publish('logic.activate');
                    }
                }
            };

            return stats;
        },

        define_callflow_nodes: function(callflow_nodes) {
            var THIS = this;

            $.extend(callflow_nodes, {
                'logic[id=*]': {
                    name: 'Logic',
                    icon: 'logic1',
                    category: 'Basic',
                    module: 'logic',
                    tip: 'Ask a caller to push a logic option or dial an extension number',
                    data: {
                        id: 'null'
                    },
                    rules: [
                        {
                            type: 'quantity',
                            maxSize: '2'
                        }
                    ],
                    isUsable: 'true',
                    key_caption: function(child_node, caption_map) {
                        var key = child_node.key;

                        return (key != '_') ? key : 'Default action';
                    },
                    key_edit: function(child_node, callback) {
                        var popup, popup_html;

                        /* The '#' Key is not available anymore but we let it here so that it doesn't break existing callflows.
                           The '#' Key is only displayed if it exists in the callflow, otherwise it is hidden by the template (see /tmpl/logic_key_callflow.html)
                        */

                        popup_html = THIS.templates.logic_key_callflow.tmpl({
                            items: {
                                '0': '0',
                                '1': '1'
                            },
                            selected: child_node.key
                        });

                        $('#add', popup_html).click(function() {
                            child_node.key = $('#logic_key_selector', popup).val();

                            child_node.key_caption = $('#logic_key_selector option:selected', popup).text();

                            popup.dialog('close');
                        });

                        popup = winkstart.dialog(popup_html, {
                            title: 'Logic Option',
                            minHeight: '0',
                            beforeClose: function() {
                                if(typeof callback == 'function') {
                                    callback();
                                }
                            }
                        });
                    },
                    caption: function(node, caption_map) {
                        var id = node.getMetadata('id'),
                            returned_value = '';

                        if(id in caption_map) {
                            returned_value = caption_map[id].name;
                        }

                        return returned_value;
                    },
                    edit: function(node, callback) {
                        var _this = this;

                        winkstart.request(true, 'logic.list',  {
                                account_id: winkstart.apps['voip'].account_id,
                                api_url: winkstart.apps['voip'].api_url
                            },
                            function(data, status) {
                                var popup, popup_html;

                                popup_html = THIS.templates.logic_callflow.tmpl({
                                    items: data.data,
                                    selected: node.getMetadata('id') || ''
                                });

                                if($('#logic_selector option:selected', popup_html).val() == undefined) {
                                    $('#edit_link', popup_html).hide();
                                }

                                $('.inline_action', popup_html).click(function(ev) {
                                    var _data = ($(this).dataset('action') == 'edit') ?
                                                    { id: $('#logic_selector', popup_html).val() } : {};

                                    ev.preventDefault();

                                    winkstart.publish('logic.popup_edit', _data, function(_data) {
                                        node.setMetadata('id', _data.data.id || 'null');

                                        node.caption = _data.data.name || '';

                                        popup.dialog('close');
                                    });
                                });

                                $('#add', popup_html).click(function() {
                                    node.setMetadata('id', $('#logic_selector', popup).val());

                                    node.caption = $('#logic_selector option:selected', popup).text();

                                    popup.dialog('close');
                                });

                                popup = winkstart.dialog(popup_html, {
                                    title: 'Logic',
                                    minHeight: '0',
                                    beforeClose: function() {
                                        if(typeof callback == 'function') {
                                            callback();
                                        }
                                    }
                                });
                            }
                        );
                    }
                }
            });
        }
    }
);
