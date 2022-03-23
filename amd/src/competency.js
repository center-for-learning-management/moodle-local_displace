define(
    ['jquery', 'core/ajax', 'core/notification', 'core/modal_factory', 'core/str'],
    function($, Ajax, Notification, ModalFactory, Str) {
    return {
        /**
         * Add a single competency to a course.
         * @param a sender of the event.
         */
        competencyAddSingle: function(a) {
            var C = this;
            console.log('Add single', a);
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
                var ishidden = children.first().hasClass('hidden');
                children.each(function() {
                    if (!ishidden) {
                        C.competencyAddSingle($(this).find('.addsingle'));
                    } else {
                        C.competencyRemoveSingle($(this).find('removesingle'));
                    }
                });
            }
        },
        /**
         * Remove a single competency to a course.
         * @param a sender of the event.
         */
        competencyRemoveSingle: function(a) {
            var C = this;
            console.log('Remove single', a);
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
