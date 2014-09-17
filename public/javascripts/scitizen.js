/*
var scitizen_user_model = {
        user: ko.observable({ username: null }),
        home: ko.observable('/'),
        login: ko.observable('/login'),
        logout: ko.observable('/logout'),
        register: ko.observable('/register')
}


if(document.getElementById('user_view')!=null) {
  ko.applyBindings(scitizen_user_model, document.getElementById('user_view'))
}
*/

/**
* Convert a timemstamp to human readable date
*
* @param {long} Unix timestamp
* @return {string}
*/
function timeConverter(UNIX_timestamp){
 var a = new Date(UNIX_timestamp);
 var months =
['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
     var year = a.getFullYear();
     var month = months[a.getMonth() - 1];
     var date = a.getDate();
     var hour = a.getHours();
     var min = a.getMinutes();
     var sec = a.getSeconds();
     var time = date + ',' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
     return time;
 }

/**
 * parses and returns URI query parameters
 *
 * @param {string} param parm
 * @param {bool?} asArray if true, returns an array instead of a scalar
 * @returns {Object|Array}
 */
function getURIParameter(param, asArray) {
    return document.location.search.substring(1).split('&').reduce(function(p,c)
    {
        var parts = c.split('=', 2).map(function(param) { return decodeURIComponent(param); });
        if(parts.length == 0 || parts[0] != param) return (p instanceof Array) && !asArray ? null : p;
        return asArray ? p.concat(parts.concat(true)[1]) : parts.concat(true)[1];
    }, []);
}

    /**
    * Render a form element
    */
    function render_form_element(elt_type, elt_id) {
        var elt = '<div class="row">';
        var labelelt = $("#labelform"+elt_id);
        if(elt_type == 'text') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<input id="r'+elt_id+'" type="text" value=""/>';
            elt += '</div>';
        }
        else if(elt_type == 'textarea') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<textarea id="r'+elt_id+'"></textarea>';
            elt += '</div>';
        }
        else if(elt_type == 'checkbox') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<input type="checkbox" id="r'+elt_id+'"/>';
            elt += '</div>';
        }
        else if(elt_type == 'single') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<select id="r'+elt_id+'">';
            var values = $("#valuesform"+elt_id).val().split(",");
            for(var i=0;i<values.length;i++) {
                elt += '<option value="'+values[i]+'">'+values[i]+'</option>';
            }
            elt += '</select>';
            elt += '</div>';
        }
        else if(elt_type == 'multiple') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<select id="r'+elt_id+'" multiple="multiple">';
            var values = $("#valuesform"+elt_id).val().split(",");
            for(var i=0;i<values.length;i++) {
                elt += '<option value="'+values[i]+'">'+values[i]+'</option>';
            }
            elt += '</select>';
            elt += '</div>';
        }
        else if(elt_type == 'rating') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<input type="hidden" id="r'+elt_id+'" value="0"/>';
            elt += '<span class="star-rating">';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="1"><i></i>';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="2"><i></i>';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="3"><i></i>';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="4"><i></i>';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="5"><i></i>';
            elt += '</span>';
            elt += '</div>';
        }

        elt += '</div>';

        return elt;
    }


    function project_form_element(form_elt, value) {
        var elt = '<div class="row">';
        var elt_type = form_elt['type'];
        var labelelt = form_elt['label'];
        var elt_id = form_elt['id'];
        if(elt_type == 'text') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt+'</label>';
            if(value==null) {
            elt += '<input required class="sciform" name="r'+elt_id+'" id="r'+elt_id+'" value=""/>';
            }
            else {
            elt += '<input disabled value="'+value+'"/>';
            elt += '<select class="sciform" name="r'+elt_id+'" id="r'+elt_id+'">';
            elt += '<option value="ok">Approve</option>';
            elt += '<option value="ko">Disapprove</option>';
            elt += '</select>';
            }
            elt += '</div>';
        }
        else if(elt_type == 'textarea') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt+'</label>';
            if(value==null) {
            elt += '<textarea required  class="sciform" name="r'+elt_id+'" id="r'+elt_id+'"></textarea>';
            }
            else {
            elt += '<textarea disabled>'+value+'</textarea>';
            elt += '<select class="sciform" name="r'+elt_id+'" id="r'+elt_id+'">';
            elt += '<option value="ok">Approve</option>';
            elt += '<option value="ko">Disapprove</option>';
            elt += '</select>';

            }
            elt += '</div>';
        }
        else if(elt_type == 'checkbox') {
            var checked = '';
            if(value==true || value=='true' || value==1) {
                checked = 'checked';
            }
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt+'</label>';
            elt += '<input '+checked+' class="sciform" name="r'+elt_id+'" type="checkbox" id="r'+elt_id+'"/>';
            elt += '</div>';
        }
        else if(elt_type == 'single') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt+'</label>';
            elt += '<select class="sciform" required name="r'+elt_id+'" id="r'+elt_id+'">';
            var values = form_elt['values'];
            var selected = '';
            for(var i=0;i<values.length;i++) {
                if(values[i]==value) {
                    selected = "selected";
                }
                else {
                    selected = "";
                }
                elt += '<option '+selected+' value="'+values[i]+'">'+values[i]+'</option>';
            }
            elt += '</select>';
            elt += '</div>';
        }
        else if(elt_type == 'multiple') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt+'</label>';
            elt += '<select class="sciform" required name="r'+elt_id+'[]" id="r'+elt_id+'" multiple="multiple">';
            var values = form_elt['values'];
            if(! value instanceof Array) {
              value = [value];
            }
            var selected = '';
            for(var i=0;i<values.length;i++) {
                if(value!=null && value.indexOf(values[i])>-1) {
                    selected = "selected";
                }
                else {
                    selected = "";
                }
                elt += '<option '+selected+' value="'+values[i]+'">'+values[i]+'</option>';
            }
            elt += '</select>';
            elt += '</div>';
        }
        else if(elt_type == 'rating') {
            elt += '<div class="small-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt+'</label>';
            elt += '<input class="sciform" type="hidden" id="r'+elt_id+'" name="r'+elt_id+'" value="'+value+'"/>';
            elt += '<span class="star-rating">';
            var checked1 = '';
            var checked2 = '';
            var checked3 = '';
            var checked4 = '';
            var checked5 = '';
            if(value==1) { checked1 = 'checked'; }
            if(value==2) { checked2 = 'checked'; }
            if(value==3) { checked3 = 'checked'; }
            if(value==4) { checked4 = 'checked'; }
            if(value==5) { checked5 = 'checked'; }
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="1" '+checked1+'><i></i>';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="2" '+checked2+'><i></i>';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="3" '+checked3+'><i></i>';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="4" '+checked4+'><i></i>';
            elt += '  <input class="rating" type="radio" data-id="r'+elt_id+'" name="rating" value="5" '+checked5+'><i></i>';
            elt += '</span>';
            elt += '</div>';
        }


        elt += '</div>';

        return elt;
    }
