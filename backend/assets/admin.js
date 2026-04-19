import { Modal } from 'bootstrap';
import 'bootstrap-tagsinput';
import './styles/admin.scss';

function buildLocalTagMatcher(tags) {
    return function findMatches(query, syncResults) {
        if (!query) {
            syncResults(tags);
            return;
        }

        const normalizedQuery = query.toLowerCase();
        const matches = tags.filter((tag) => tag.toLowerCase().includes(normalizedQuery));
        syncResults(matches);
    };
}

$(function () {
    // Bootstrap-tagsinput initialization
    // https://bootstrap-tagsinput.github.io/bootstrap-tagsinput/examples/
    var $input = $('input[data-toggle="tagsinput"]');
    if ($input.length) {
        var tags = $input.data('tags') || [];

        $input.tagsinput({
            trimValue: true,
            focusClass: 'focus',
            typeaheadjs: {
                name: 'tags',
                source: buildLocalTagMatcher(tags)
            }
        });
    }
});

// Handling the modal confirmation message.
$(document).on('submit', 'form[data-confirmation]', function (event) {
    var $form = $(this),
        $confirm = $('#confirmationModal');

    if ($confirm.data('result') !== 'yes') {
        //cancel submit event
        event.preventDefault();

        $confirm
            .off('click', '#btnYes')
            .on('click', '#btnYes', function () {
                $confirm.data('result', 'yes');
                $form.find('input[type="submit"]').attr('disabled', 'disabled');
                $form.trigger('submit');
            });

        Modal.getOrCreateInstance($confirm[0]).show();
    }
});
