define(
    ['jquery', 'core/ajax', 'core/notification', 'core/modal_factory', 'core/str'],
    function($, Ajax, Notification, ModalFactory, Str) {
    return {
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
         */
        toggleInit: function() {
            var C = this;
            $('tr[data-path="/0/"]>td>a').each(function() {
                C.toggleNode(this);
            });
            // @todo find the nodes we use and re-activate!
        },
        /**
         * Recursively toggle nodes.
         * @param id
         */
        toggleNode: function(sender) {
            console.log('toggle ', sender);
            var tr = $(sender).closest('tr');
            var id = tr.attr('data-id');
            var path = tr.attr('data-path');
            var childrenvisible = tr.hasClass('children-visible');

            if (childrenvisible) {
                // Make all children hidden.
                console.log('hide');
                $('tr.childof-' + id).each(
                    function() {
                        var subpath = $(this).attr('data-path');
                        $('tr[data-path^="' + subpath + '"]').addClass('hidden');
                    }
                );
                $(tr).removeClass('children-visible');
            } else {
                console.log('show');
                // Make direct children visible.
                $('tr.childof-' + id).removeClass('hidden');
                $(tr).addClass('children-visible');
            }
        },
    };
});
