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

namespace local_displace\competency;
defined('MOODLE_INTERNAL') || die;

class locallib {
    /**
     * Load the competency-list of a framework.
     * @param frameworkid the id of the framework.
     * @param path the path to load.
     * @param tree the array to attach items to.
     * @param depth the depth.
     **/
    public static function build_competency_list($frameworkid, $path, $depth = []) {
        global $courseid, $DB;

        $depth[] = count($depth);

        $sql = "SELECT *
                    FROM {competency}
                    WHERE competencyframeworkid = ?
                        AND path = ?
                    ORDER BY shortname ASC";
        $params = [$frameworkid, $path];
        $competencies = $DB->get_records_sql($sql, $params);
        $list = [];
        foreach ($competencies as &$item) {
            if ($path != '/0/') {
                $item->hide = 1;
            }
            if (empty($item->shortname)) {
                $item->shortname = $item->description;
            }
            $subpath = $path . $item->id . "/";
            $item->depth = $depth;

            $used = $DB->get_record('competency_coursecomp', ['courseid' => $courseid, 'id' => $item->id]);
            $item->isused = (!empty($used->id)) ? 1 : 0;
            $sublist = self::build_competency_list($frameworkid, $subpath, json_decode(json_encode($depth)));
            $item->haschildren = count($sublist) > 0 ? 1 : 0;
            $list[] = $item;
            $list = array_merge($list, $sublist);
        }

        return $list;
    }

    /**
     * Load the competency-tree of a framework.
     * @param frameworkid the id of the framework.
     * @param path the path to load.
     * @param tree the array to attach items to.
     * @param depth the depth.
     **/
    public static function build_competency_tree($frameworkid, $path, $tree = false, $depth = 0) {
        if (!$tree)
            $tree = (object)[];
        global $courseid, $DB;

        $sql = "SELECT *
                    FROM {competency}
                    WHERE competencyframeworkid = ?
                        AND path = ?
                    ORDER BY shortname ASC";
        $params = [$frameworkid, $path];
        $tree->competencies = array_values($DB->get_records_sql($sql, $params));
        foreach ($tree->competencies as &$item) {
            if ($path != '/0/') {
                $item->hide = 1;
            }
            if (empty($item->shortname)) {
                $item->shortname = $item->description;
            }
            $subpath = $path . $item->id . "/";
            $item->depth = $depth;

            $used = $DB->get_record('competency_coursecomp', ['courseid' => $courseid, 'id' => $item->id]);
            $item->isused = (!empty($used->id)) ? 1 : 0;

            self::build_competency_tree($frameworkid, $subpath, $item, $depth + 1);

            $item->haschildren = !empty($item->competencies);
        }
        return $tree;
    }
}
