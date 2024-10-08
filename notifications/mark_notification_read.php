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
 * Mark a notification read and redirect to the relevant content.
 * Adapted by Austrian Federal Ministry of Education for use within the Austrian education portal.
 * This redirect keeps the original behaviour, but always redirects the user to the "read full notification"-page.
 *
 * @package    message_popup
 * @copyright  2018 Michael Hawkins
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../../config.php');

require_login(null, false);

if (isguestuser()) {
    redirect($CFG->wwwroot);
}

$notificationid = required_param('notificationid', PARAM_INT);

$notification = $DB->get_record('notifications', array('id' => $notificationid));

$redirecturl = new moodle_url('/message/output/popup/notifications.php', ['notificationid' => $notificationid]);

// Check notification belongs to this user.
if ($USER->id != $notification->useridto) {
    redirect($CFG->wwwroot);
}

\core_message\api::mark_notification_as_read($notification);
redirect($redirecturl);
