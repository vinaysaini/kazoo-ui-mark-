winkstart.module('ivr', 'product', {
        css: [
            'css/style.css'
        ],

        templates: {
            product: 'tmpl/product.html',
            edit: 'tmpl/edit.html'
        },

        subscribe: {
            'product.activate': 'activate',
            'product.edit': 'edit_product',
            'callflow.define_callflow_nodes': 'define_callflow_nodes',
            'product.popup_edit': 'popup_edit_product'
        },

        resources: {
            'product.list': {
                url: '{api_url}/accounts/{account_id}/products',
                contentType: 'application/json',
                verb: 'GET'
            },
            'product.get': {
                url: '{api_url}/accounts/{account_id}/products/{product_id}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'product.create': {
                url: '{api_url}/accounts/{account_id}/products',
                contentType: 'application/json',
                verb: 'PUT'
            },
            'product.update': {
                url: '{api_url}/accounts/{account_id}/products/{product_id}',
                contentType: 'application/json',
                verb: 'POST'
            },
            'product.delete': {
                url: '{api_url}/accounts/{account_id}/products/{product_id}',
                contentType: 'application/json',
                verb: 'DELETE'
            },
            'campaign.list': {
                url: '{api_url}/accounts/{account_id}/campaigns',
                contentType: 'application/json',
                verb: 'GET'
            },
            'callflow.list': {
                url: '{api_url}/accounts/{account_id}/callflows',
                contentType: 'application/json',
                verb: 'GET'
            },
            'media.list': {
                url: '{api_url}/accounts/{account_id}/media',
                contentType: 'application/json',
                verb: 'GET'
            }
        },

        validation: [{
            name: '#product_name',
            regex: /^.+$/
        }, {
            name: '#product_id',
            regex: /^.+$/
        }, {
            name: '#max_call',
            regex: /^.+$/
        }]
    },

    function (args) {
        var THIS = this;

        winkstart.registerResources(this.__whapp, this.config.resources);

        winkstart.publish('whappnav.subnav.add', {
            whapp: 'ivr',
            module: this.__module,
            label: 'Advertisers',
            icon: 'sip',
            weight: '05',
        });
    }, {
        save_product: function (form_data, data, success, error) {
            var THIS = this,
                normalized_data = THIS.normalize_data($.extend(true, {}, data.data, form_data));

            if (typeof data.data == 'object' && data.data.id) {
                winkstart.request(true, 'product.update', {
                        account_id: winkstart.apps['ivr'].account_id,
                        api_url: winkstart.apps['ivr'].api_url,
                        product_id: data.data.id,
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
                winkstart.request(true, 'product.create', {
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

        edit_product: function (data, _parent, _target, _callbacks, data_defaults) {
            var THIS = this,
                parent = _parent || $('#product-content'),
                target = _target || $('#product-view', parent),
                _callbacks = _callbacks || {},
                callbacks = {
                    save_success: _callbacks.save_success || function (_data) {
                        THIS.render_list(parent);

                        THIS.edit_product({
                            id: _data.data.id
                        }, parent, target, callbacks);
                    },

                    save_error: _callbacks.save_error,

                    delete_success: _callbacks.delete_success || function () {
                        target.empty(),

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
                        users: []
                    }
                };

            winkstart.parallel({
                    campaign_list: function (callback) {
                        winkstart.request(true, 'campaign.list', {
                                account_id: winkstart.apps['ivr'].account_id,
                                api_url: winkstart.apps['ivr'].api_url
                            },
                            function (_data, status) {
                                _data.data.unshift({
                                    id: '',
                                    first_name: '- No',
                                    last_name: 'owner -'
                                });

                                defaults.field_data.campaigns = _data.data;

                                callback(null, _data);
                            }
                        );
                    },
                    media_list: function (callback) {
                        winkstart.request(true, 'media.list', {
                                account_id: winkstart.apps['ivr'].account_id,
                                api_url: winkstart.apps['ivr'].api_url
                            },
                            function (_data, status) {
                                _data.data.unshift({
                                    id: '',
                                    first_name: '- No',
                                    last_name: 'owner -'
                                });

                                defaults.field_data.advertiser_media_id = _data.data;

                                callback(null, _data);
                            }
                        );
                    },
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
                    get_product: function (callback) {
                        if (typeof data == 'object' && data.id) {
                            winkstart.request(true, 'product.get', {
                                    account_id: winkstart.apps['ivr'].account_id,
                                    api_url: winkstart.apps['ivr'].api_url,
                                    product_id: data.id
                                },
                                function (_data, status) {
                                    THIS.format_data(_data);

                                    callback(null, _data);
                                }
                            );
                        } else {
                            callback(null, {});
                        }
                    }
                },
                function (err, results) {
                    var render_data = defaults;

                    if (typeof data === 'object' && data.id) {
                        render_data = $.extend(true, defaults, results.get_product);
                    }

                    THIS.render_product(render_data, target, callbacks);

                    if (typeof callbacks.after_render == 'function') {
                        callbacks.after_render();
                    }
                }
            );
        },

        delete_product: function (data, success, error) {
            var THIS = this;

            if (data.data.id) {
                winkstart.request(true, 'product.delete', {
                        account_id: winkstart.apps['ivr'].account_id,
                        api_url: winkstart.apps['ivr'].api_url,
                        product_id: data.data.id
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

        render_product: function (data, target, callbacks) {
            var THIS = this,
                product_html = THIS.templates.edit.tmpl(data);

            winkstart.validate.set(THIS.config.validation, product_html);

            $('*[rel=popover]:not([type="text"])', product_html).popover({
                trigger: 'hover'
            });

            $('*[rel=popover][type="text"]', product_html).popover({
                trigger: 'focus'
            });

            winkstart.tabs($('.view-buttons', product_html), $('.tabs', product_html));

            if (!$('#campaign_id', product_html).val()) {
                $('#edit_link', product_html).hide();
            }

            $('#campaign_id', product_html).change(function () {
                !$('#campaign_id option:selected', product_html).val() ? $('#edit_link', product_html).hide() : $('#edit_link', product_html).show();
            });

            $('.inline_action', product_html).click(function (ev) {
                var _data = ($(this).dataset('action') == 'edit') ? {
                    id: $('#campaign_id', product_html).val()
                } : {},
                    _id = _data.id;

                ev.preventDefault();

                winkstart.publish('campaign.popup_edit', _data, function (_data) {
                    /* Create */
                    if (!_id) {
                        $('#campaign_id', product_html).append('<option id="' + _data.data.id + '" value="' + _data.data.id + '">' + _data.data.first_name + ' ' + _data.data.last_name + '</option>');
                        $('#campaign_id', product_html).val(_data.data.id);
                        $('#edit_link', product_html).show();
                    } else {
                        /* Update */
                        if ('id' in _data.data) {
                            $('#campaign_id #' + _data.data.id, product_html).text(_data.data.first_name + ' ' + _data.data.last_name);
                        }
                        /* Delete */
                        else {
                            $('#campaign_id #' + _id, product_html).remove();
                            $('#edit_link', product_html).hide();
                        }
                    }
                });
            });

            $('.product-save', product_html).click(function (ev) {
                ev.preventDefault();

                winkstart.validate.is_valid(THIS.config.validation, product_html, function () {
                        var form_data = form2object('product-form');

                        data.id = form_data.id;

                        if ('field_data' in data) {
                            delete data.field_data;
                        }

                        THIS.save_product(form_data, data, callbacks.save_success, winkstart.error_message.process_error(callbacks.save_error));
                    },
                    function () {
                        winkstart.alert('There were errors on the form, please correct!');
                    }
                );
            });

            $('.product-delete', product_html).click(function (ev) {
                ev.preventDefault();

                winkstart.confirm('Are you sure you want to delete this product?', function () {
                    THIS.delete_product(data, callbacks.delete_success, callbacks.delete_error);
                });
            });

            (target)
                .empty()
                .append(product_html);
        },

        format_data: function (data) {
            if (typeof data.data.member == 'object') {
                if ($.isArray(data.data.id)) {
                    data.data.id_string = data.data.id.join(', ');
                }
            }

            return data;
        },

        normalize_data: function (data) {
            if (!data.product_id.length) {
                delete data.product_id;
            }

            if (!data.product_name.length) {
                delete data.product_name;
            }

            if (!data.max_call.length) {
                delete data.max_call;
            }

            delete data.product_id_string;
            delete data.product_name_string;
            delete data.max_call_string;

            return data;
        },

        render_list: function (parent) {
            var THIS = this;

            winkstart.request(true, 'product.list', {
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
                                    title: val.product_name || '(no name)'
                                });
                            });
                        }

                        new_list.sort(function (a, b) {
                            return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
                        });

                        return new_list;
                    };

                    $('#product-listpanel', parent)
                        .empty()
                        .listpanel({
                            label: 'Advertisers',
                            identifier: 'product-listview',
                            new_entity_label: 'Add Advertiser',
                            data: map_crossbar_data(data.data),
                            publisher: winkstart.publish,
                            notifyMethod: 'product.edit',
                            notifyCreateMethod: 'product.edit',
                            notifyParent: parent
                        });
                });
        },

        activate: function (parent) {
            var THIS = this,
                product_html = THIS.templates.product.tmpl();

            (parent || $('#ws-content'))
                .empty()
                .append(product_html);

            THIS.render_list(product_html);
        },

        popup_edit_product: function (data, callback, data_defaults) {
            var popup, popup_html;

            popup_html = $('<div class="inline_popup"><div class="inline_content main_content"/></div>');

            winkstart.publish('product.edit', data, popup_html, $('.inline_content', popup_html), {
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
                        title: (data.id) ? 'Edit product' : 'Create product'
                    });
                }
            }, data_defaults);
        },
    }
);
