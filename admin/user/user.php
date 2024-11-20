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
 * @package   local_displace
 * @copyright 2023 Austrian Federal Ministry of Education
 * @author    Robert Schrenk
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../../../config.php');

$sitecontext = \context_system::instance();
require_capability('local/displace:admin_user_viewtable', $sitecontext);

$PAGE->set_context($sitecontext);
$PAGE->set_url('/local/displace/admin/user/user.php');
$PAGE->set_primary_active_tab('siteadminnode');
$PAGE->set_title(get_string('userlist', 'admin'));
$PAGE->navbar->add(get_string('userlist', 'admin'), $PAGE->url);

$table = new \local_displace\admin\user\table();

echo $OUTPUT->header();
$table->out();
if (has_capability('moodle/user:create', $sitecontext)) {
    $url = new moodle_url('/user/editadvanced.php', array('id' => -1));
    echo $OUTPUT->single_button($url, get_string('addnewuser'), 'get');
}
echo $OUTPUT->footer();
