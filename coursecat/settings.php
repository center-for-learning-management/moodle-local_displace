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

namespace local_displace\coursecat;
defined('MOODLE_INTERNAL') || die;

class settings {
    /**
     * Add required settings to admin settings page.
    **/
    public static function admin_settings_page() {
        global $ADMIN;
        if (empty($ADMIN)) {
            return;
        }

        $settings = new \admin_settingpage('local_displace_coursecat', get_string('coursecat:setting', 'local_displace'));
        $ADMIN->add('local_displace', $settings);

        $settings->add(
            new \admin_setting_configcheckbox(
                'local_displace/coursecat_enabled',
                get_string('coursecat:setting:enabled', 'local_displace'),
                '',
                '',
                PARAM_INT
            )
        );

    }
}
