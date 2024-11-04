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
     * Load the competency-tree of a framework.
     * @param frameworkid the id of the framework.
     * @param path the path to load.
     * @param tree the array to attach items to.
     * @param depth the depth.
     **/
    public static function get_competencies_grouped_by_parent($frameworkid) {
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

        return $competenciesByParent;
    }

    public static function prepare_competency_selector() {
        global $PAGE;

        static $prepared = false;
        if (!$prepared) {
            $prepared = true;
            $PAGE->requires->css('/local/displace/style/competency.css');
        }
    }

    public static function render_competency_selector($courseid, $frameworkid, $initially_hidden = false, string $session_competencies_input = '') {
        global $DB, $OUTPUT, $PAGE;

        static::prepare_competency_selector();

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

        $params = [
            'initially_hidden' => $initially_hidden,
            'courseid' => $courseid,
            'frameworks' => $frameworks,
            'session_competencies_input' => $session_competencies_input,
        ];

        return $OUTPUT->render_from_template('local_displace/competency/coursecompetenciesadd', $params);
    }

    public static function render_competency_selector_tree($courseid, $frameworkid) {
        $competenciesByParent = static::get_competencies_grouped_by_parent($frameworkid);

        $canselect = (int)get_config('local_displace', 'competency_canselect');
        $canselectall = (int)get_config('local_displace', 'competency_canselectall');

        $uses_komet = (int)get_config('local_komettranslator', 'version');

        $renderItems = function($competencies, $depth = 0) use (&$competenciesByParent, &$renderItems, $uses_komet, $canselect, $canselectall) {
            global $OUTPUT;

            foreach ($competencies as $competency) {
                $competency->depth = $depth;

                if ($competenciesByParent[$competency->id] ?? false) {
                    $competency->children_output = $renderItems($competenciesByParent[$competency->id], $depth + 1);
                    $competency->haschildren = true;
                }

                $usedbykomet = false;

                if ($uses_komet) {
                    $usedbykomet = !!\local_komettranslator\api::get_copmetency_mapping($competency->id);
                    if ($usedbykomet) {
                        break;
                    }
                }

                if ($competency->used || !$uses_komet || !$usedbykomet || $competency->depth >= $canselect) {
                    $competency->canselect = 1;
                }
                if (!$uses_komet || !$usedbykomet || $competency->depth >= $canselectall) {
                    $competency->canselectall = 1;
                }
            }

            $params = [
                'competencies' => $competencies,
            ];

            return $OUTPUT->render_from_template('local_displace/competency/coursecompetenciesadd_tree_item', $params);
        };

        return $renderItems($competenciesByParent[0]);
    }
}
