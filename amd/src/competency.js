define(
    ['jquery', 'core/ajax', 'core/notification', 'core/modal_factory', 'core/pending','core/str'],
    function($, Ajax, Notification, ModalFactory, Pending, Str) {
    return {
        debug: false,
        queue: [],
        queueActiveItem: false,
        /**
         * Add a single competency to a course.
         * @param {DOMElement} a sender of the event.
         */
        competencyAddSingle: function(a) {
            let C = this;
            if (C.debug) console.log('Add single', a);

            let courseid = $(a).closest('table').attr('data-courseid');
            let id = $(a).closest('tr').attr('data-id');
            let method = 'core_competency_add_competency_to_course';
            let data = { 'courseid': courseid, 'competencyid': id };
            C.queue.push({'methodname': method, 'args': data, 'tr': $(a).closest('tr') });
            $(a).closest('tr').addClass('queue-pending');
            C.competencyQueue();
        },
        /**
         * Add/Remove multiple competencies
         * to/from a course.
         * @param {DOMElement} a sender of the event.
         */
        competencyAddMultiple: function(a) {
            let C = this;
            // Get the first child to decide if we
            // add or remove.
            let tr = $(a).closest('tr');
            let id = tr.attr('data-id');
            let children = tr.closest('table').find('tr.childof-' + id);
            if (children.length > 0) {
                if (C.debug) console.log('children', children);
                let isused = children.first().hasClass('used');
                if (!isused) {
                    children.each(function() {
                        if (!$(this).hasClass('used')) {
                            C.competencyAddSingle($(this).find('.addsingle'));
                        }
                    });
                } else {
                    let shortname = $(a).closest('tr').find('.shortname').html();
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
         * @param {DOMElement} a sender of the event.
         * @param {bool} confirmed if the user confirmed the action.
         */
        competencyRemoveSingle: function(a, confirmed) {
            let C = this;
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
                if (C.debug) console.log('Remove single', a);
                let courseid = $(a).closest('table').attr('data-courseid');
                let id = $(a).closest('tr').attr('data-id');
                let method = 'core_competency_remove_competency_from_course';
                let data = { 'courseid': courseid, 'competencyid': id };
                C.queue.push({'methodname': method, 'args': data, 'tr': $(a).closest('tr') });
                $(a).closest('tr').addClass('queue-pending');
                C.competencyQueue();
            }
        },
        /**
         * Handles the next item in queue.
         */
        competencyQueue: function() {
            let C = this;
            if (C.queueActiveItem) {
                return;
            }
            if (C.queue.length == 0) {
                return;
            }
            let item = C.queue.shift();
            if (C.debug) console.log('Queue Item', item);
            C.queueActiveItem = true;
            Ajax.call([{
                methodname: item.methodname,
                args: item.args,
                done: function(result) {
                    $(item.tr).removeClass('queue-pending');
                    if (C.debug) {
                        console.log('Results of ' + item.methodname, result);
                    }
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
        /**
         * Show the description
         * @param {OOMElement} a
         */
        modalDescription: function(a) {
            let description = $(a).find('.description').html();
            let shortname = $(a).find('.shortname').html();
            ModalFactory.create({
                title: shortname,
                body: description,
            }).done(function(modal) {
                modal.show();
            });
        },
        /**
         * Sets the rule outcome option.
         * @param {DOMElement} select
         */
        setRuleOutcomeOption: function(select) {
            let pendingPromise = new Pending();
            let requests = [];

            let coursecompetencyid = $(select).closest('tr').attr('data-id');
            let ruleoutcome = $(select).val();
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
        },
        /**
         * Initially collapse all competency frameworks.
         * @param {string} uniqid of template.
         */
        toggleInit: function(uniqid) {
            let C = this;
            if (C.debug) {
                console.log(uniqid);
            }
            let table = $('#coursecompetenciesadd-' + uniqid);
            table.find('tr[data-path="/0/"]>td>a').each(function() {
                C.toggleNode(this);
            });
            table.find('tr.used').each(function() {
                C.toggleInitRecursive(this);
            });
        },
        /**
         * Toggle recursively nodes by their parents.
         * @param {DOMElement} tr to start with.
         */
        toggleInitRecursive: function(tr) {
            let C = this;
            $(tr).removeClass('hidden');
            $(tr).addClass('children-visible');
            let childof = parseInt($(tr).attr('data-childof'));
            if (childof > 0) {
                let parent = $(tr).closest('table').find('tr[data-id=' + childof + ']');
                if (parent.length > 0) {
                    $('tr.childof-' + childof).removeClass('hidden');
                    C.toggleInitRecursive(parent);
                }
            }
        },
        /**
         * Recursively toggle nodes.
         * @param {DOMElement} sender
         */
        toggleNode: function(sender) {
            let tr = $(sender).closest('tr');
            let id = tr.attr('data-id');
            let childrenvisible = tr.hasClass('children-visible');

            if (childrenvisible) {
                // Make all children hidden.
                $('tr.childof-' + id).each(
                    function() {
                        let subpath = $(this).attr('data-path');
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
