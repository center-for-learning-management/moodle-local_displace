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
 * @package    local_webuntis
 * @copyright  2021 Zentrum für Lernmanagement (www.lernmanagement.at)
 * @author     Robert Schrenk
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

if ($hassiteconfig) {
    $ADMIN->add(
        'localplugins',
        new admin_category(
            'local_displace',
            get_string('pluginname', 'local_displace')
        )
    );

    require_once(__DIR__ . "/admin/user/settings.php");
    \local_displace\admin\user\settings::admin_settings_page();

    require_once(__DIR__ . "/competency/settings.php");
    \local_displace\competency\settings::admin_settings_page();

    require_once(__DIR__ . "/coursecat/settings.php");
    \local_displace\coursecat\settings::admin_settings_page();

    require_once(__DIR__ . "/notifications/settings.php");
    \local_displace\notifications\settings::admin_settings_page();

    require_once(__DIR__ . "/question/settings.php");
    \local_displace\question\settings::admin_settings_page();
}
