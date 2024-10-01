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
 * @copyright 2022 Zentrum für Lernmanagement (www.lernmanagement.at)
 * @author    Robert Schrenk
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

function local_displace_after_config() {
    global $CFG;

    // get path within the moodle dir + fix slashes in windows
    $subpath = str_replace(
        str_replace('\\', '/', $CFG->dirroot),
        '',
        str_replace('\\', '/', $_SERVER['SCRIPT_FILENAME']));

    switch ($subpath) {
        case "/admin/user.php":
            if (!empty(get_config('local_displace', 'admin_user_enabled'))) {
                include("{$CFG->dirroot}/local/displace/admin/user/redirect.php");
            }
        break;
        case "/admin/tool/lp/coursecompetencies.php":
            if (!empty(get_config('local_displace', 'competency_enabled'))) {
                $url = "/local/displace/competency/coursecompetencies.php?" . $_SERVER['QUERY_STRING'];
                redirect($url);
            }
            break;
        case "/question/category.php":
            if (!empty(get_config('local_displace', 'question_enabled'))) {
                $url = "/local/displace/question/category.php?" . $_SERVER['QUERY_STRING'];
                redirect($url);
            }
            break;
        case "/course/management.php":
            if (!empty(get_config('local_displace', 'coursecat_enabled'))) {
                if (
                    (is_siteadmin() && !empty(get_config('local_displace', 'coursecat_enabled_admin')))
                    || (is_siteadmin() && !empty(get_config('local_displace', 'coursecat_enabled_user')))
                ) {
                    $url = "/local/displace/coursecat/management.php?" . $_SERVER['QUERY_STRING'];
                    redirect($url);
                }
            }
        break;
        case "/message/output/popup/mark_notification_read.php":
            if (!empty(get_config('local_displace', 'notifications_enabled'))) {
                $url = "/local/displace/notifications/mark_notification_read.php?" . $_SERVER['QUERY_STRING'];
                redirect($url);
            }
        break;
    }
}

function local_displace_before_standard_html_head() {

}
