 winkstart.module('ivr', 'callerlist', {
         css: [
             'css/callerlist.css'
         ],

         templates: {
             callerlist: 'tmpl/callerlist.html',
             callerlist_details: 'tmpl/callerlist_details.html'
         },

         subscribe: {
             'callerlist.activate': 'activate',
         },

         resources: {
             'callerlist.list': {
                 url: '{api_url}/accounts/{account_id}/callerlists',
                 contentType: 'application/json',
                 verb: 'GET'
             },
             'callerlist.read': {
                 url: '{api_url}/accounts/{account_id}/callerlists/{callerlist_id}',
                 contentType: 'application/json',
                 verb: 'GET'
             },
             'callerlist.list_by_week': {
                 url: '{api_url}/accounts/{account_id}/campaign_call_record?created_from={created_from}&created_to={created_to}',
                 contentType: 'application/json',
                 verb: 'GET'
             },
             'callerlist.from_queue': {
                 url: '{api_url}/accounts/{account_id}/campaign_call_record?created_from={created_from}&created_to={created_to}&has_key={filter}',
                 contentType: 'application/json',
                 verb: 'GET'
             },
             'callerlist.not_from_queue': {
                 url: '{api_url}/accounts/{account_id}/campaign_call_record?created_from={created_from}&created_to={created_to}&key_missing={filter}',
                 contentType: 'application/json',
                 verb: 'GET'
             },
             'callerlist.export_file': {
                 url: '{api_url}/accounts/{account_id}/campaign_call_record?created_from={created_from}&created_to={created_to}',
                 contentType: 'application/json',
                 verb: 'GET'
             },
             'callerlist.list_by_product': {
                 url: '{api_url}/accounts/{account_id}/campaign_call_records?created_from={product_seq_id}&created_to={product_seq_id}',
                 contentType: 'application/json',
                 verb: 'GET'
             },
         }
     },
     function (args) {
         winkstart.registerResources(this.__whapp, this.config.resources);

         winkstart.publish('whappnav.subnav.add', {
             whapp: 'ivr',
             module: this.__module,
             label: 'Caller List',
             icon: 'cdr',
             weight: '50',
         });
     }, {
         callerlist_range: 1000,

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
                 parse_callerlist_id = function (callerlist_id) {
                     return callerlist_id.substr(0, 1) + '/' + callerlist_id.substr(1, 1) + '/' + callerlist_id.substr(2, 1) + '/' + callerlist_id;
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
                     callerlist_list: function (callback) {
                         var request_string = 'callerlist.list_by_week',
                             data_request = {
                                 account_id: winkstart.apps['ivr'].account_id,
                                 api_url: winkstart.apps['ivr'].api_url,
                                 created_from: start_date,
                                 created_to: end_date
                             };

                         if (filter === 'queue') {
                             request_string = 'callerlist.from_queue';
                             data_request.filter = 'custom_channel_vars.queue_id';
                         } else if (filter === 'non-queue') {
                             request_string = 'callerlist.not_from_queue';
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
                     var caller_no = 1;
                     var tab_data = [];
                     $.each(results.callerlist_list.data, function () {
                         var pvt_created = this.timestamp - 3600;
                         var date = new Date((pvt_created - 62167219200) * 1000),
                             //month = date.getMonth() +1,
                             //year = date.getFullYear(),
                             //day = date.getDate(),

                             month = ("0" + (date.getMonth() + 1)).slice(-2),
                             year = ("0" + (date.getFullYear())).slice(-2),
                             day = ("0" + (date.getDate())).slice(-2),
                             humanDate = year + '-' + month + '-' + day,
                             humanTime = date.toTimeString();
                         //hour = date.getHours() -1,
                         //minutes = date.getMinutes(),
                         //seconds = date.getSeconds();
                         //humanTime = hour+':'+minutes+':'+seconds;
                         var parsed_date = humanDate + ' ' + humanTime;

                         tab_data.push([caller_no, this.caller_id, this.product_id, parsed_date]);
                         caller_no++;
                     });

                     call_duration = 'Total duration : ' + parse_duration(call_duration, 'verbose');
                     $('.call_duration', '#callerlist-grid_wrapper').text(call_duration);

                     winkstart.table.callerlist.fnAddData(tab_data, true);
                 }
             );
         },


         list_by_product: function (product_seq_id) {
             var THIS = this;

             winkstart.parallel({
                     user_list: function (callback) {
                         winkstart.request(true, 'user.list', {
                                 account_id: winkstart.apps['ivr'].account_id,
                                 api_url: winkstart.apps['ivr'].api_url
                             },
                             function (_data, status) {

                                 callback(null, _data);
                             }
                         );
                     },
                     callerlist_list: function (callback) {
                         var request_string = 'callerlist.list_by_product',
                             data_request = {
                                 account_id: winkstart.apps['ivr'].account_id,
                                 api_url: winkstart.apps['ivr'].api_url,
                                 product_seq_id: product_seq_id
                             };


                         winkstart.request(true, request_string, data_request,
                             function (_data, status) {
                                 callback(null, _data);
                             }
                         );
                     }
                 },
                 function (err, results) {

                     var tab_data = [];
                     var time = [];
                     var callingtime;
                     var humanFullDate;
                     $.each(results.callerlist_list.data, function () {
                         var pvt_created = this.timestamp - 3600;
                         var date = new Date((pvt_created - 62167219200) * 1000),
                             //month = date.getMonth() +1,
                             //year = date.getFullYear(),
                             //day = date.getDate(),
                             month = ("0" + (date.getMonth() + 1)).slice(-2),
                             year = ("0" + (date.getFullYear())).slice(-2),
                             day = ("0" + (date.getDate())).slice(-2),
                             humanDate = year + '-' + month + '-' + day,
                             humanTime = date.toTimeString();
                         //hour = date.getHours() -1,
                         //minutes = date.getMinutes(),
                         //seconds = date.getSeconds();
                         //humanTime = hour+':'+minutes+':'+seconds;
                         var parsed_date = humanDate + ' ' + humanTime;
                         tab_data.push([this.call_count, this.caller_id, this.product_id, parsed_date]);
                     });

                     winkstart.table.callerlist.fnAddData(tab_data);
                 }
             );
         },

         export_file: function (product_seq_id1, start_date, end_date) {
             var THIS = this;

             winkstart.parallel({
                     callerlist_list: function (callback) {
                         var request_string = 'callerlist.export_file',
                             data_request = {
                                 account_id: winkstart.apps['ivr'].account_id,
                                 api_url: winkstart.apps['ivr'].api_url,
                                 product_seq_id1: product_seq_id1,
                                 created_from: start_date,
                                 created_to: end_date
                             };


                         winkstart.request(true, request_string, data_request,
                             function (_data, status) {
                                 callback(null, _data);
                             }
                         );
                     }
                 },
                 function (err, results) {

                     var tab_data = [];
                     var caller_no2 = 1;
                     $.each(results.callerlist_list.data, function () {
                         var pvt_created = this.timestamp - 3600;
                         var date = new Date((pvt_created - 62167219200) * 1000),
                             //month = date.getMonth() +1,
                             //year = date.getFullYear(),
                             //day = date.getDate(),
                             month = ("0" + (date.getMonth() + 1)).slice(-2),
                             year = ("0" + (date.getFullYear())).slice(-2),
                             day = ("0" + (date.getDate())).slice(-2),
                             humanDate = year + '-' + month + '-' + day,
                             humanTime = date.toTimeString();
                         //hour = date.getHours() -1,
                         //minutes = date.getMinutes(),
                         //seconds = date.getSeconds();
                         //humanTime = hour+':'+minutes+':'+seconds;
                         var parsed_date = humanDate + ' ' + humanTime;
                         if (this.product_id == product_seq_id1) {
                             tab_data.push([this.call_count, this.caller_id, this.product_id, parsed_date]);
                         }
                         //caller_no2++;		
                     });
                     //tab_data.sort() 

                     tab_data.sort(function (a, b) {
                         return a[3] - b[3];
                     });

                     var str = tab_data.join("\n");
                     //alert(str);
                     var csvContent = "data:text/csv;charset=utf-8,Call Count,Caller ID,Campaign ID,Calling Time\n";

                     csvContent += str
                     var encodedUri = encodeURI(csvContent);
                     window.open(encodedUri);

                 }
             );
         },



         init_table: function (parent) {
             var callerlist_html = parent,
                 columns = [{
                     'sTitle': 'Caller No.',
                     'sWidth': '150px'
                 }, {
                     'sTitle': 'Caller ID',
                     'sWidth': '250px'
                 }, {
                     'sTitle': 'Campaign ID',
                     'sWidth': '250px'
                 }, {
                     'sTitle': 'Calling Time'
                 }];

             winkstart.table.create('callerlist', $('#callerlist-grid', callerlist_html), columns, {}, {
                 sDom: '<"date">frtlip',
                 aaSorting: [
                     [3, 'desc']
                 ]
             });

             $('.cancel-search', callerlist_html).click(function () {
                 $('#registration-grid_filter input[type=text]', callerlist_html).val('');
                 winkstart.table.callerlist.fnFilter('');
             });
         },

         parse_data_callerlist: function (data) {
             var return_data = [],
                 return_sub_data,
                 THIS = this;

             function hide_fqdn(value) {
                 return value = (winkstart.config.hide_fqdn) ? value.replace('.2600hz.com', '') : value;
             }

             $.each(data, function (k, v) {
                 if (typeof v == 'object') {
                     return_sub_data = THIS.parse_data_callerlist(this);

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
                 callerlist_html = this.templates.callerlist.tmpl({}),
                 init_range = 1,
                 range = THIS.callerlist_range;

             $('#ws-content').empty().append(callerlist_html);

             THIS.init_table(callerlist_html);

             $.fn.dataTableExt.afnFiltering.pop();

             $('div.date', callerlist_html).html('Start Date: <input id="startDate" readonly="readonly" type="text"/>&nbsp;&nbsp;End Date: <input id="endDate" readonly="readonly" type="text"/>&nbsp;&nbsp;&nbsp;&nbsp;<button class="btn primary button-search" id="searchLink1">Filter</button>&nbsp;&nbsp;Product ID: <input id="product_seq_id" type="text" placeholder="Product ID"/>&nbsp;&nbsp;<button class="btn primary button-search" id="searchLink2">Filter</button>&nbsp;&nbsp;&nbsp;&nbsp;Product ID: <input id="product_seq_id1" type="text" placeholder="Product ID"/>&nbsp;&nbsp;<button class="btn primary button-search" id="searchLink3">Export File</button>');
             /*<label class="call_duration"/>*/
             $(callerlist_html).delegate('.table_owner_link', 'click', function () {
                 winkstart.publish('user.popup_edit', {
                     id: $(this).attr('id')
                 });
             });

             $('#callerlist-grid_filter input[type=text]', '#callerlist-grid_wrapper').keyup(function () {
                 if ($(this).val() != '') {
                     $('.call_duration', '#callerlist-grid_wrapper').hide();
                 } else {
                     $('.call_duration', '#callerlist-grid_wrapper').show();
                 }
             });

             if (!('call_center' in winkstart.apps)) {
                 $('#dropdown_filter', callerlist_html).hide();
             }

             $(callerlist_html).delegate('.table_detail_link', 'click', function () {
                 var callerlist_id = $(this).dataset('callerlist_id');

                 winkstart.request(true, 'callerlist.read', {
                         account_id: winkstart.apps['ivr'].account_id,
                         api_url: winkstart.apps['ivr'].api_url,
                         callerlist_id: callerlist_id,
                     },
                     function (_data, status) {
                         var callerlist_data = THIS.parse_data_callerlist(_data.data);
                         callerlist_data = callerlist_data.sort(function (a, b) {
                             var keyA = a.key.toLowerCase(),
                                 keyB = b.key.toLowerCase();

                             return keyA <= keyB ? -1 : 1;
                         });

                         var tmpl_data = {
                             callerlist_fields: callerlist_data
                         }
                     }
                 );
             });
             $('#searchLink2', callerlist_html).click(function () {
                 var product_seq_id = $('#product_seq_id', callerlist_html).val();
                 THIS.list_by_product(product_seq_id);
                 winkstart.table.callerlist.fnClearTable();
                 $('.call_duration', '#callerlist-grid_wrapper').text('');
             });
             $('#searchLink3', callerlist_html).click(function () {
                 var start_date = $('#startDate', callerlist_html).val(),
                     end_date = $('#endDate', callerlist_html).val(),
                     product_seq_id1 = $('#product_seq_id1', callerlist_html).val();
                 regex = /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.](19|20)\d\d$/;

                 winkstart.table.callerlist.fnClearTable();
                 $('.call_duration', '#callerlist-grid_wrapper').text('');
                 var start_date = (new Date(start_date).getTime() / 1000) + 62167305600,
                     end_date = (new Date(end_date).getTime() / 1000) + 62167305600;
                 //var start_date = (new Date(start_date).getTime()/1000) + 62167219200,
                 //end_date = (new Date(end_date).getTime()/1000) + 62167219200;
                 THIS.export_file(product_seq_id1, start_date, end_date);
             });




             $('#searchLink1', callerlist_html).click(function () {
                 var start_date = $('#startDate', callerlist_html).val(),
                     end_date = $('#endDate', callerlist_html).val(),
                     regex = /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.](19|20)\d\d$/;

                 winkstart.table.callerlist.fnClearTable();
                 $('.call_duration', '#callerlist-grid_wrapper').text('');

                 if (start_date.match(regex) && end_date.match(regex)) {
                     var start_date_sec = (new Date(start_date).getTime() / 1000) + 62167219200,
                         end_date_sec = (new Date(end_date).getTime() / 1000) + 62167219200;

                     if ((end_date_sec - start_date_sec) <= (range * 24 * 60 * 60)) {
                         THIS.list_by_date(start_date_sec, end_date_sec, $('#dropdown_filter', callerlist_html).val());
                     } else {
                         winkstart.alert('The range is bigger than 7 days, please correct it.');
                     }
                 } else {
                     winkstart.alert('Dates in the filter are not in the proper format (mm/dd/yyyy)');
                 }
             });

             THIS.init_datepicker(callerlist_html);

             var tomorrow = new Date(THIS.to_string_date(new Date()));
             tomorrow.setDate(tomorrow.getDate() + 1);

             var end_date = Math.floor(tomorrow.getTime() / 1000) + 62167219200,
                 start_date = end_date - (init_range * 24 * 60 * 60);

             THIS.list_by_date(start_date, end_date);
         },


         init_datepicker: function (parent) {
             var THIS = this,
                 callerlist_html = parent,
                 $start_date = $('#startDate', callerlist_html),
                 $end_date = $('#endDate', callerlist_html),
                 start_date = new Date(),
                 end_date,
                 tomorrow = new Date(),
                 init_range = 1,
                 range = THIS.callerlist_range;

             tomorrow.setDate(tomorrow.getDate() + 1);

             $('#startDate, #endDate', callerlist_html).datepicker({
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
                     range = THIS.callerlist_range;

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
