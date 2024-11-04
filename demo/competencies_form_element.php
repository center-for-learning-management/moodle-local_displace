<?php

// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package    local_captcha
 * @copyright  2024 Austrian Federal Ministry of Education
 * @author     GTN solutions
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');

require_once($CFG->libdir . "/formslib.php");

class local_captcha_demo_form extends \moodleform {
    function definition() {
        $mform = $this->_form;


        $element = new \local_displace\competencies_form_element('test1');
        $mform->addElement($element);

        $element = new \local_displace\competencies_form_element('test2');
        $mform->addElement($element);

        $mform->addElement('text', 'name', get_string('name'));
        $mform->addRule('name', get_string('required'), 'required', null, 'server');
        $mform->setType('name', PARAM_TEXT);

        $this->add_action_buttons(false, get_string('submit'));
    }
}

$context = \context_system::instance();
$PAGE->set_context($context);

$PAGE->set_url('/local/displace/demo/competencies_form_element.php');
$PAGE->set_title('Captcha Demo');

require_admin();

$mform = new local_captcha_demo_form($PAGE->url);
$mform->set_data(['test1' => '123', 'test2' => '456', ]);
if ($fromform = $mform->get_data()) {
    echo $OUTPUT->header();

    \local_captcha\captcha_form_element::setCaptchaUsed();
    echo 'Captcha ok';

    echo $OUTPUT->footer();
    exit;
} else {
    echo $OUTPUT->header();

    $mform->display();

    echo $OUTPUT->footer();
    exit;
}
