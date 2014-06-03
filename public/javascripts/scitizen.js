
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
            elt += '<div class="large-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<input id="r'+elt_id+'" type="text" value=""/>';
            elt += '</div>';
        }
        else if(elt_type == 'textarea') {
            elt += '<div class="large-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<textarea id="r'+elt_id+'"></textarea>';
            elt += '</div>';
        }
        else if(elt_type == 'checkbox') {
            elt += '<div class="large-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<input type="checkbox" id="r'+elt_id+'"/>';
            elt += '</div>';
        }
        else if(elt_type == 'single') {
            elt += '<div class="large-8 columns">';
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
            elt += '<div class="large-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt.val()+'</label>';
            elt += '<select id="r'+elt_id+'" multiple="multiple">';
            var values = $("#valuesform"+elt_id).val().split(",");
            for(var i=0;i<values.length;i++) {
                elt += '<option value="'+values[i]+'">'+values[i]+'</option>';
            }
            elt += '</select>';
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
            elt += '<div class="large-8 columns">';
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
            elt += '<div class="large-8 columns">';
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
            elt += '<div class="large-8 columns">';
            elt += '<label class="left" for="r'+elt_id+'">'+labelelt+'</label>';
            elt += '<input '+checked+' class="sciform" name="r'+elt_id+'" type="checkbox" id="r'+elt_id+'"/>';
            elt += '</div>';
        }
        else if(elt_type == 'single') {
            elt += '<div class="large-8 columns">';
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
            elt += '<div class="large-8 columns">';
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

        elt += '</div>';

        return elt;
    }
