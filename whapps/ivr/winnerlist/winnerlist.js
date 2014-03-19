winkstart.module('ivr', 'winnerlist', {
        css: [
            'css/winnerlist.css'
        ],

        templates: {
            winnerlist: 'tmpl/winnerlist.html',
            winnerlist_details: 'tmpl/winnerlist_details.html'
        },

        subscribe: {
            'winnerlist.activate': 'activate',
        },

        resources: {
            'winnerlist.list': {
                url: '{api_url}/accounts/{account_id}/winnerlists',
                contentType: 'application/json',
                verb: 'GET'
            },
            'winnerlist.read': {
                url: '{api_url}/accounts/{account_id}/winnerlists/{winnerlist_id}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'winnerlist.list_by_week': {
                url: '{api_url}/accounts/{account_id}/winner_record?created_from={created_from}&created_to={created_to}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'winnerlist.from_queue': {
                url: '{api_url}/accounts/{account_id}/winner_record?created_from={created_from}&created_to={created_to}&has_key={filter}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'winnerlist.not_from_queue': {
                url: '{api_url}/accounts/{account_id}/winner_record?created_from={created_from}&created_to={created_to}&key_missing={filter}',
                contentType: 'application/json',
                verb: 'GET'
            }
        }
    },
    function (args) {
        winkstart.registerResources(this.__whapp, this.config.resources);

        winkstart.publish('whappnav.subnav.add', {
            whapp: 'ivr',
            module: this.__module,
            label: 'Winner List',
            icon: 'cdr',
            weight: '50',
        });
    }, {
        winnerlist_range: 100,

        list_by_date: function (start_date, end_date, filter) {
            var THIS = this,
                filter = filter || '',
                map_users = {},
                parse_duration = function (duration, type) {
                    var duration = parseFloat(duration);
                    seconds = duration % 60,
                    minutes = ((duration - seconds) / 60) % 60,
                    hours = Math.floor((duration - seconds) / 3600),
                    type = type || 'numbers';

                    if (hours < 10 && type == 'numbers') {
                        hours = '0' + hours;
                    }
                    if (minutes < 10) {
                        minutes = '0' + minutes;
                    }
                    if (seconds < 10) {
                        seconds = '0' + seconds;
                    }

                    if (type == 'verbose') {
                        duration = hours + ' hours ' + minutes + ' minutes and ' + seconds + ' seconds';
                    } else {
                        duration = hours + ':' + minutes + ':' + seconds;
                    }

                    return duration;
                },
                find_user_name = function (owner_id) {
                    var parsed_name = '';

                    if (owner_id && map_users[owner_id]) {
                        parsed_name = map_users[owner_id].first_name + ' ' + map_users[owner_id].last_name;
                    }

                    return parsed_name;
                },
                parse_date = function (timestamp) {
                    var parsed_date = '-';

                    if (timestamp) {
                        var date = new Date((timestamp - 62167219200) * 1000),
                            month = date.getMonth() + 1,
                            year = date.getFullYear(),
                            day = date.getDate(),
                            humanDate = month + '/' + day + '/' + year,
                            humanTime = date.toLocaleTimeString();

                        parsed_date = humanDate + ' ' + humanTime;
                    }

                    return parsed_date;
                },
                parse_winnerlist_id = function (winnerlist_id) {
                    return winnerlist_id.substr(0, 1) + '/' + winnerlist_id.substr(1, 1) + '/' + winnerlist_id.substr(2, 1) + '/' + winnerlist_id;
                };

            winkstart.parallel({
                    user_list: function (callback) {
                        winkstart.request(true, 'user.list', {
                                account_id: winkstart.apps['ivr'].account_id,
                                api_url: winkstart.apps['ivr'].api_url
                            },
                            function (_data, status) {
                                $.each(_data.data, function () {
                                    map_users[this.id] = this;
                                });

                                callback(null, _data);
                            }
                        );
                    },
                    winnerlist_list: function (callback) {
                        var request_string = 'winnerlist.list_by_week',
                            data_request = {
                                account_id: winkstart.apps['ivr'].account_id,
                                api_url: winkstart.apps['ivr'].api_url,
                                created_from: start_date,
                                created_to: end_date
                            };

                        if (filter === 'queue') {
                            request_string = 'winnerlist.from_queue';
                            data_request.filter = 'custom_channel_vars.queue_id';
                        } else if (filter === 'non-queue') {
                            request_string = 'winnerlist.not_from_queue';
                            data_request.filter = 'custom_channel_vars.queue_id';
                        }

                        winkstart.request(true, request_string, data_request,
                            function (_data, status) {
                                callback(null, _data);
                            }
                        );
                    }
                },
                function (err, results) {
                    var humanFullDate,
                        call_duration = 0;

                    var tab_data = [];

                    $.each(results.winnerlist_list.data, function () {
                        humanFullDate = parse_date(this.timestamp);
                        call_duration += this.billing_seconds >= 0 ? parseFloat(this.billing_seconds) : 0;

                        tab_data.push([this.caller_id, this.campaign_id, this.product_id, this.calling_time]);
                    });

                    call_duration = 'Total duration : ' + parse_duration(call_duration, 'verbose');
                    $('.call_duration', '#winnerlist-grid_wrapper').text(call_duration);

                    winkstart.table.winnerlist.fnAddData(tab_data);
                }
            );
        },

        init_table: function (parent) {
            var winnerlist_html = parent,
                columns = [{
                    'sTitle': 'Caller ID',
                    'sWidth': '250px'
                }, {
                    'sTitle': 'Campaign ID',
                    'sWidth': '250px'
                }, {
                    'sTitle': 'Product ID',
                    'sWidth': '160px'
                }, {
                    'sTitle': 'Calling Time'
                }];

            winkstart.table.create('winnerlist', $('#winnerlist-grid', winnerlist_html), columns, {}, {
                sDom: '<"date">frtlip',
                aaSorting: [
                    [4, 'desc']
                ]
            });

            $('.cancel-search', winnerlist_html).click(function () {
                $('#registration-grid_filter input[type=text]', winnerlist_html).val('');
                winkstart.table.winnerlist.fnFilter('');
            });
        },

        parse_data_winnerlist: function (data) {
            var return_data = [],
                return_sub_data,
                THIS = this;

            function hide_fqdn(value) {
                return value = (winkstart.config.hide_fqdn) ? value.replace('.2600hz.com', '') : value;
            }

            $.each(data, function (k, v) {
                if (typeof v == 'object') {
                    return_sub_data = THIS.parse_data_winnerlist(this);

                    $.each(return_sub_data, function (k2, v2) {
                        if (jQuery.inArray(v2.key, ['app_name', 'app_version', 'server_id', 'id']) < 0) {
                            v2.value = hide_fqdn(v2.value);
                            return_data.push({
                                'key': v2.key,
                                'value': v2.value
                            });
                        }
                    });
                } else {
                    if (jQuery.inArray(k, ['app_name', 'app_version', 'server_id', 'id']) < 0) {
                        v = hide_fqdn(v);
                        return_data.push({
                            'key': k,
                            'value': v
                        });
                    }
                }
            });
            return return_data;
        },

        activate: function (data) {
            var THIS = this,
                winnerlist_html = this.templates.winnerlist.tmpl({}),
                init_range = 1,
                range = THIS.winnerlist_range;

            $('#ws-content').empty().append(winnerlist_html);

            THIS.init_table(winnerlist_html);

            $.fn.dataTableExt.afnFiltering.pop();

            $('div.date', winnerlist_html).html('Start Date: <input id="startDate" readonly="readonly" type="text"/>&nbsp;&nbsp;End Date: <input id="endDate" readonly="readonly" type="text"/>&nbsp;&nbsp;&nbsp;&nbsp;<select id="dropdown_filter"><option value="all">All Calls</option><option value="queue">Queue Calls</option><option value="non-queue">Non-Queue Calls</option></select><button class="btn primary button-search" id="searchLink">Filter</button>');
            /*<label class="call_duration"/>*/
            $(winnerlist_html).delegate('.table_owner_link', 'click', function () {
                winkstart.publish('user.popup_edit', {
                    id: $(this).attr('id')
                });
            });

            $('#winnerlist-grid_filter input[type=text]', '#winnerlist-grid_wrapper').keyup(function () {
                if ($(this).val() != '') {
                    $('.call_duration', '#winnerlist-grid_wrapper').hide();
                } else {
                    $('.call_duration', '#winnerlist-grid_wrapper').show();
                }
            });

            if (!('call_center' in winkstart.apps)) {
                $('#dropdown_filter', winnerlist_html).hide();
            }

            $(winnerlist_html).delegate('.table_detail_link', 'click', function () {
                var winnerlist_id = $(this).dataset('winnerlist_id');

                winkstart.request(true, 'winnerlist.read', {
                        account_id: winkstart.apps['ivr'].account_id,
                        api_url: winkstart.apps['ivr'].api_url,
                        winnerlist_id: winnerlist_id,
                    },
                    function (_data, status) {
                        var winnerlist_data = THIS.parse_data_winnerlist(_data.data);
                        winnerlist_data = winnerlist_data.sort(function (a, b) {
                            var keyA = a.key.toLowerCase(),
                                keyB = b.key.toLowerCase();

                            return keyA <= keyB ? -1 : 1;
                        });

                        var tmpl_data = {
                            winnerlist_fields: winnerlist_data
                        }
                    }
                );
            });

            $('#searchLink', winnerlist_html).click(function () {
                var start_date = $('#startDate', winnerlist_html).val(),
                    end_date = $('#endDate', winnerlist_html).val(),
                    regex = /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.](19|20)\d\d$/;

                winkstart.table.winnerlist.fnClearTable();
                $('.call_duration', '#winnerlist-grid_wrapper').text('');

                if (start_date.match(regex) && end_date.match(regex)) {
                    var start_date_sec = (new Date(start_date).getTime() / 1000) + 62167219200,
                        end_date_sec = (new Date(end_date).getTime() / 1000) + 62167219200;

                    if ((end_date_sec - start_date_sec) <= (range * 24 * 60 * 60)) {
                        THIS.list_by_date(start_date_sec, end_date_sec, $('#dropdown_filter', winnerlist_html).val());
                    } else {
                        winkstart.alert('The range is bigger than 7 days, please correct it.');
                    }
                } else {
                    winkstart.alert('Dates in the filter are not in the proper format (mm/dd/yyyy)');
                }
            });

            THIS.init_datepicker(winnerlist_html);

            var tomorrow = new Date(THIS.to_string_date(new Date()));
            tomorrow.setDate(tomorrow.getDate() + 1);

            var end_date = Math.floor(tomorrow.getTime() / 1000) + 62167219200,
                start_date = end_date - (init_range * 24 * 60 * 60);

            THIS.list_by_date(start_date, end_date);
        },

        init_datepicker: function (parent) {
            var THIS = this,
                winnerlist_html = parent,
                $start_date = $('#startDate', winnerlist_html),
                $end_date = $('#endDate', winnerlist_html),
                start_date = new Date(),
                end_date,
                tomorrow = new Date(),
                init_range = 1,
                range = THIS.winnerlist_range;

            tomorrow.setDate(tomorrow.getDate() + 1);

            $('#startDate, #endDate', winnerlist_html).datepicker({
                beforeShow: customRange,
                onSelect: customSelect
            });

            end_date = tomorrow;
            start_date.setDate(new Date().getDate() - init_range + 1);

            $start_date.datepicker('setDate', start_date);
            $end_date.datepicker('setDate', end_date);

            function customSelect(dateText, input) {
                var date_min,
                    date_max;

                if (input.id == 'startDate') {
                    date_min = $start_date.datepicker('getDate');
                    if ($end_date.datepicker('getDate') == null) {
                        date_max = date_min;
                        date_max.setDate(date_min.getDate() + range);
                        $end_date.val(THIS.to_string_date(date_max));
                    } else {
                        date_max = $end_date.datepicker('getDate');
                        if ((date_max > (new Date(date_min).setDate(date_min.getDate() + range)) || (date_max <= date_min))) {
                            date_max = date_min;
                            date_max.setDate(date_max.getDate() + range);
                            date_max > tomorrow ? date_max = tomorrow : true;
                            $end_date.val(THIS.to_string_date(date_max));
                        }
                    }
                } else if (input.id == 'endDate') {
                    if ($start_date.datepicker('getDate') == null) {
                        date_min = $end_date.datepicker('getDate');
                        date_min.setDate(date_min.getDate() - 1);
                        $start_date.val(THIS.to_string_date(date_min));
                    }
                }
            };

            function customRange(input) {
                var date_min = new Date(2011, 0, 0),
                    date_max,
                    range = THIS.winnerlist_range;

                if (input.id == 'endDate') {
                    date_max = tomorrow;
                    if ($start_date.datepicker('getDate') != null) {
                        date_min = $start_date.datepicker('getDate');
                        /* Range of 1 day minimum */
                        date_min.setDate(date_min.getDate() + 1);
                        date_max = $start_date.datepicker('getDate');
                        date_max.setDate(date_max.getDate() + range);

                        if (date_max > tomorrow) {
                            date_max = tomorrow;
                        }
                    }
                } else if (input.id == 'startDate') {
                    date_max = new Date();
                }

                return {
                    minDate: date_min,
                    maxDate: date_max
                };
            }
        },

        to_string_date: function (date) {
            var day = date.getDate(),
                month = date.getMonth() + 1,
                year = date.getFullYear();

            day < 10 ? day = '0' + day : true;
            month < 10 ? month = '0' + month : true;

            return month + '/' + day + '/' + year;
        }
    });
