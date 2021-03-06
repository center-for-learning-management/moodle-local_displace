define(
    ['jquery', 'core/ajax', 'core/notification', 'core/modal_factory', 'core/pending','core/str'],
    function($, Ajax, Notification, ModalFactory, Pending, Str) {
    return {
        queue: [],
        queueActiveItem: false,
        /**
         * Add a single competency to a course.
         * @param a sender of the event.
         */
        competencyAddSingle: function(a) {
            var C = this;
            console.log('Add single', a);

            var courseid = $(a).closest('table').attr('data-courseid');
            var id = $(a).closest('tr').attr('data-id');
            var method = 'core_competency_add_competency_to_course';
            var data = { 'courseid': courseid, 'competencyid': id };
            C.queue.push({'methodname': method, 'args': data, 'tr': $(a).closest('tr') });
            $(a).closest('tr').addClass('queue-pending');
            C.competencyQueue();
        },
        /**
         * Add/Remove multiple competencies
         * to/from a course.
         * @param a sender of the event.
         */
        competencyAddMultiple: function(a) {
            var C = this;
            // Get the first child to decide if we
            // add or remove.
            var tr = $(a).closest('tr');
            var id = tr.attr('data-id');
            var children = tr.closest('table').find('tr.childof-' + id);
            if (children.length > 0) {
                console.log('children', children);
                var isused = children.first().hasClass('used');
                if (!isused) {
                    children.each(function() {
                        if (!$(this).hasClass('used')) {
                            C.competencyAddSingle($(this).find('.addsingle'));
                        }
                    });
                } else {
                    var shortname = $(a).closest('tr').find('.shortname').html();
                    Str.get_strings([
                            {'key' : 'competency:remove:title', component: 'local_displace' },
                            {'key' : 'competency:remove:multiple', component: 'local_displace', param: { 'shortname': shortname } },
                            {'key' : 'yes' },
                            {'key': 'no'}
                        ]).done(function(s) {
                            Notification.confirm(
                                s[0], s[1], s[2], s[3],
                                function() {
                                    children.each(function() {
                                        if ($(this).hasClass('used')) {
                                            C.competencyRemoveSingle($(this).find('.removesingle'), true);
                                        }
                                    });
                                }
                            );
                        }
                    ).fail(Notification.exception);
                }

            }
        },
        /**
         * Remove a single competency to a course.
         * @param a sender of the event.
         * @param confirmed if the user confirmed the action.
         */
        competencyRemoveSingle: function(a, confirmed) {
            var C = this;
            if (typeof confirmed === 'undefined') {
                var shortname = $(a).closest('tr').find('.shortname').html();
                Str.get_strings([
                        {'key' : 'competency:remove:title', component: 'local_displace' },
                        {'key' : 'competency:remove:single', component: 'local_displace', param: { 'shortname': shortname } },
                        {'key' : 'yes' },
                        {'key': 'no'}
                    ]).done(function(s) {
                        Notification.confirm(
                            s[0], s[1], s[2], s[3],
                            function() {
                                C.competencyRemoveSingle(a, true);
                            }
                        );
                    }
                ).fail(Notification.exception);
            } else {
                console.log('Remove single', a);
                var courseid = $(a).closest('table').attr('data-courseid');
                var id = $(a).closest('tr').attr('data-id');
                var method = 'core_competency_remove_competency_from_course';
                var data = { 'courseid': courseid, 'competencyid': id };
                C.queue.push({'methodname': method, 'args': data, 'tr': $(a).closest('tr') });
                $(a).closest('tr').addClass('queue-pending');
                C.competencyQueue();
            }
        },
        /**
         * Handles the next item in queue.
         */
        competencyQueue: function() {
            var C = this;
            if (C.queueActiveItem) return;
            if (C.queue.length == 0) return;
            var item = C.queue.shift();
            console.log('Queue Item', item);
            C.queueActiveItem = true;
            Ajax.call([{
                methodname: item.methodname,
                args: item.args,
                done: function(result) {
                    $(item.tr).removeClass('queue-pending');
                    console.log('Results of ' + item.methodname, result);
                    if (result) {
                        if (item.methodname == 'core_competency_add_competency_to_course') {
                            $(item.tr).addClass('used');
                        } else {
                            $(item.tr).removeClass('used');
                        }
                        $(item.tr).addClass('displace-alert success');
                        setTimeout(
                            function() {
                                $(item.tr).removeClass('displace-alert success');
                            }, 1000
                        );
                    } else {
                        $(item.tr).addClass('displace-alert danger');
                    }
                    C.queueActiveItem = false;
                    C.competencyQueue();
                },
                fail: function(ex) {
                    $(item.tr).addClass('displace-alert danger');
                    C.queueActiveItem = false;
                    Notification.exception(ex);
                }
            }]);
        },
        modalDescription: function(a) {
            var description = $(a).find('.description').html();
            var shortname = $(a).find('.shortname').html();
            ModalFactory.create({
                title: shortname,
                body: description,
            }, trigger).done(function(modal) {
                modal.show();
            });
        },
        /**
         * Sets the rule outcome option.
         */
        setRuleOutcomeOption: function(select) {
            var pendingPromise = new Pending();
            var requests = [];

            var coursecompetencyid = $(select).closest('tr').attr('data-id');
            var ruleoutcome = $(select).val();
            requests = Ajax.call([
                {methodname: 'core_competency_set_course_competency_ruleoutcome',
                  args: {coursecompetencyid: coursecompetencyid, ruleoutcome: ruleoutcome}},
                {methodname: 'tool_lp_data_for_course_competencies_page',
                  args: {courseid: $(select).closest('table').attr('data-courseid'), moduleid: 0}}
            ]);
            requests[1].then(function(context) {
                $(select).addClass('displace-alert success');
                setTimeout(
                    function(){
                        $(select).removeClass('displace-alert success');
                    },
                    1000
                );
            })
            .then(pendingPromise.resolve);
            //.catch(Notification.exception);
        },
        /**
         * Initially collapse all competency frameworks.
         * @param uniqid of template.
         */
        toggleInit: function(uniqid) {
            console.log(uniqid);
            var C = this;
            var table = $('#coursecompetenciesadd-' + uniqid);
            table.find('tr[data-path="/0/"]>td>a').each(function() {
                C.toggleNode(this);
            });
            table.find('tr.used').each(function() {
                C.toggleInitRecursive(this);
            });
        },
        /**
         * Toggle recursively nodes by their parents.
         * @param tr to start with.
         */
        toggleInitRecursive: function(tr) {
            var C = this;
            $(tr).removeClass('hidden');
            $(tr).addClass('children-visible');
            var childof = parseInt($(tr).attr('data-childof'));
            if (childof > 0) {
                var parent = $(tr).closest('table').find('tr[data-id=' + childof + ']');
                if (parent.length > 0) {
                    var path = $(parent).attr('data-path');
                    $('tr.childof-' + childof).removeClass('hidden');
                    C.toggleInitRecursive(parent);
                }
            }
        },
        /**
         * Recursively toggle nodes.
         * @param id
         */
        toggleNode: function(sender) {
            var tr = $(sender).closest('tr');
            var id = tr.attr('data-id');
            var path = tr.attr('data-path');
            var childrenvisible = tr.hasClass('children-visible');

            if (childrenvisible) {
                // Make all children hidden.
                $('tr.childof-' + id).each(
                    function() {
                        var subpath = $(this).attr('data-path');
                        $('tr[data-path^="' + subpath + '"]').addClass('hidden');
                    }
                );
                $(tr).removeClass('children-visible');
            } else {
                // Make direct children visible.
                $('tr.childof-' + id).removeClass('hidden');
                $(tr).addClass('children-visible');
            }
        },
    };
});
