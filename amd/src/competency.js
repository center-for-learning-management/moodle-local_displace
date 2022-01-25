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
        }
    };
});
