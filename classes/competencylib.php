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

namespace local_displace;
defined('MOODLE_INTERNAL') || die;

class competencylib {
    /**
     * Load the competency-list of a framework.
     * @param frameworkid the id of the framework.
     * @param path the path to load.
     * @param tree the array to attach items to.
     * @param depth the depth.
     **/
    public static function build_competency_list($frameworkid) {
        global $courseid, $DB;

        $sql = "SELECT c.*, IF(ccc.id>0,1,0) as used
                    FROM {competency} c
                    LEFT JOIN {competency_coursecomp} ccc ON c.id = ccc.competencyid AND ccc.courseid = ?
                    WHERE competencyframeworkid = ?
                    ORDER BY shortname ASC";
        $competencies = $DB->get_records_sql($sql, [$courseid, $frameworkid]);
        $competenciesByParent = [];

        foreach ($competencies as $item) {
            if (!$item->shortname) {
                $item->shortname = $item->description;
            }
            $item->depth = 0;

            $item->longname = $item->shortname;
            if (class_exists(\local_komettranslator\api::class)) {
                $item->longname = \local_komettranslator\api::get_competency_longname($item);
            }

            if (!isset($competenciesByParent[$item->parentid])) {
                $competenciesByParent[$item->parentid] = [];
            }
            $competenciesByParent[$item->parentid][] = $item;
        }

        $todoList = $competenciesByParent[0] ?? [];
        $list = [];
        while ($item = array_shift($todoList)) {
            $list[] = $item;

            $sublist = $competenciesByParent[$item->id] ?? [];
            $item->haschildren = count($sublist) > 0;

            if ($sublist) {
                foreach ($sublist as $subitem) {
                    $subitem->depth = $item->depth + 1;
                }

                // add children in front of the todo list, so they are processed next
                $todoList = array_merge($sublist, $todoList);
            }
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
            if ($item->id)
                $subpath = $path . $item->id . "/";
            $item->depth = $depth;

            $used = $DB->get_record('competency_coursecomp', ['courseid' => $courseid, 'id' => $item->id]);
            $item->isused = (!empty($used->id)) ? 1 : 0;

            self::build_competency_tree($frameworkid, $subpath, $item, $depth + 1);

            $item->haschildren = !empty($item->competencies);
        }
        return $tree;
    }

    public static function render_competency_selector($courseid, $frameworkid, $initially_hidden = false) {
        global $DB, $OUTPUT, $PAGE;

        $PAGE->requires->css('/local/displace/style/competency.css');

        if ($courseid) {
            // $sql = "SELECT DISTINCT(c.id) id
            // FROM {competency} c, {competency_coursecomp} ccc
            // WHERE c.id = ccc.competencyid
            //     AND ccc.courseid = ?";
            // $usedids = array_keys($DB->get_records_sql($sql, [$courseid]));

            if (!$frameworkid) {
                // get first used framework
                $sql = "SELECT f.id
                    FROM {competency_framework} f
                    JOIN {competency} c ON c.competencyframeworkid = f.id AND f.visible = 1
                    JOIN {competency_coursecomp} ccc ON c.id = ccc.competencyid AND ccc.courseid = ?
                    ORDER BY f.id ASC
                    LIMIT 1";
                $frameworkid = $DB->get_field_sql($sql, [$courseid]);
            }

            $context = \context_course::instance($courseid);
        } else {
            // // bei einem erneuten Anzeigen des Formulares die bereits selektierten Kompetenzen markieren
            // if (!empty($_REQUEST['session_competencies'])) {
            //     $usedids = explode(',', $_REQUEST['session_competencies']);
            // } else {
            // $usedids = [];
            // }

            $context = \context_system::instance();
        }

        $path = explode('/', $context->path);
        list($insql, $inparams) = $DB->get_in_or_equal($path);
        $sql = "SELECT *
            FROM {competency_framework}
            WHERE visible=1
                AND contextid $insql
            ORDER BY shortname ASC";
        $frameworks = array_values($DB->get_records_sql($sql, $inparams));
        if (!$frameworks) {
            throw new \moodle_exception('nocompetencyframeworks', 'tool_lp');
        }

        if (!$frameworkid) {
            $frameworkid = $frameworks[0]->id;
        }

        foreach ($frameworks as $framework) {
            if ($framework->id == $frameworkid) {
                $framework->selected = 1;
            }
        }

        if ($initially_hidden) {
            $frameworkid = 'dummy';
        } else {
        }
        $params = [
            'action' => '',
            'initially_hidden' => $initially_hidden,
            'courseid' => $courseid,
            'frameworkid' => $frameworkid,
            'frameworks' => $frameworks,
            'session_competencies' => $_REQUEST['session_competencies'] ?? '',
        ];

        return $OUTPUT->render_from_template('local_displace/competency/coursecompetenciesadd', $params);
    }

    public static function render_competency_selector_tree($courseid, $frameworkid) {
        global $OUTPUT;

        $competencytree = static::build_competency_list($frameworkid);

        $params = [
            'action' => 'competency_selector_tree',
            // 'courseid' => $courseid,
            'frameworkid' => $frameworkid,
            'competencies' => $competencytree,
        ];

        $canselect = get_config('local_displace', 'competency_canselect');
        $canselectall = get_config('local_displace', 'competency_canselectall');

        $uses_komet = get_config('local_komettranslator', 'version');
        $komet_types = ['subject', 'topic', 'descriptor'];

        foreach ($competencytree as $competency) {
            $usedbykomet = false;

            if (!empty($uses_komet)) {
                foreach ($komet_types as $komet_type) {
                    $usedbykomet = \local_komettranslator\api::get_copmetency_mapping($komet_type, $competency->id);
                    if ($usedbykomet) {
                        break;
                    }
                }
            }

            if ($competency->used || empty($uses_komet) || !$usedbykomet || $competency->depth > $canselect) {
                $competency->canselect = 1;
            }
            if (empty($uses_komet) || !$usedbykomet || $competency->depth > $canselectall) {
                $competency->canselectall = 1;
            }

            $competency->depthpx = $competency->depth * 25 + 15;
        }

        return $OUTPUT->render_from_template('local_displace/competency/coursecompetenciesadd_tree', $params);
    }
}
