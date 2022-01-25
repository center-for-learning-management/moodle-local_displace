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
 * @package    local_displace
 * @copyright  2022 Zentrum für Lernmanagement (www.lernmanagement.at)
 * @author     Robert Schrenk
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../../config.php');

$courseid = required_param('courseid', PARAM_INT);
$currentmodule = optional_param('mod', 0, PARAM_INT);
if ($currentmodule > 0) {
    $cm = get_coursemodule_from_id('', $currentmodule, 0, false, MUST_EXIST);
}

$course = \get_course($courseid);

require_login($course);
\core_competency\api::require_enabled();

$urlparams = array('courseid' => $course->id, 'mod' => $currentmodule);
$PAGE->set_context(\context_course::instance($courseid));
$PAGE->set_url('/local/displace/competency/coursecompetencies.php', $urlparams);
$PAGE->set_title($course->fullname);
$PAGE->set_heading($course->fullname);

$PAGE->navbar->add(get_string('coursecompetencies', 'tool_lp'), $PAGE->url);

/*
$PAGE->requires->css('/local/webuntis/style/main.css');
*/

$sql = "SELECT *
            FROM {competency} c, {competency_coursecomp} ccc
            WHERE c.id = ccc.competencyid
                AND ccc.courseid = ?";
$params = [ $course->id ];
$coursecomps = $DB->get_records_sql($sql, $params);

$frameworks = [];
$pathcomp = [];
foreach ($coursecomps as &$coursecomp) {
    if (empty($frameworks[$coursecomp->competencyframeworkid])) {
        $params = [ 'id' => $coursecomp->competencyframeworkid ];
        $frameworks[$coursecomp->competencyframeworkid] =
            $DB->get_record('competency_framework', $params);
    }
    if (!empty($frameworks[$coursecomp->competencyframeworkid])) {
        $coursecomp->framework = $frameworks[$coursecomp->competencyframeworkid];
    }

    $coursecomp->_path = [];
    $path = explode('/', $coursecomp->path);
    for ($a = 0; $a < count($path); $a++) {
        $compid = $path[$a];
        if (empty($pathcomp[$compid])) {
            $pathcomp[$compid] = $DB->get_record('competency', [ 'id' => $compid]);
        }
        if (!empty($pathcomp[$compid])) {
            $coursecomp->_path[] = (object) [
                'competency' => 1,
                'id' => $pathcomp[$compid]->id,
                'shortname' => $pathcomp[$compid]->shortname,
            ];
        }
    }
}

$params = [
    'competencies' => array_values($coursecomps),
    'courseid'     => $course->id,
    'wwwroot'      => $CFG->wwwroot,
];

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_displace/competency/coursecompetencies', $params);
echo $OUTPUT->footer();
