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
 * @package    local_eduvidual
 * @copyright  2018 Digital Education Society (http://www.dibig.at)
 *             2020 onwards Zentrum für Lernmanagement (http://www.lernmanagement.at)
 * @author     Robert Schrenk
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_displace\coursecat;

defined('MOODLE_INTERNAL') || die;

class externallib extends \external_api {
    public static function get_category_parameters() {
        return new \external_function_parameters(array(
            'categoryid' => new \external_value(PARAM_INT, 'categoryid'),
        ));
    }
    public static function get_category($categoryid) {
        global $CFG, $DB;
        $params = self::validate_parameters(
            self::get_category_parameters(),
            array(
                'categoryid' => $categoryid
            )
        );



        return json_encode($seltree, JSON_NUMERIC_CHECK);
    }
    public static function get_category_returns() {
        return new \external_value(PARAM_RAW, 'Returns nested coursecategories and courses as JSON string.');
    }
}
