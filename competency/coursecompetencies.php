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
$context = \context_course::instance($course->id);
require_login($course);
\core_competency\api::require_enabled();

$coursecompetencyconfigure = has_capability('moodle/competency:coursecompetencyconfigure', $context);
$canmanagecoursecompetencies = has_capability('moodle/competency:coursecompetencymanage', $context);

$urlparams = array('courseid' => $course->id);
if (!empty($currentmodule)) {
    $urlparams['mod'] = $currentmodule;
}
$PAGE->set_context($context);
$PAGE->set_url('/local/displace/competency/coursecompetencies.php', $urlparams);
$PAGE->set_title($course->fullname);
$PAGE->set_heading($course->fullname);
$PAGE->requires->css('/local/displace/style/competency.css');

$PAGE->navbar->add(get_string('coursecompetencies', 'tool_lp'), $PAGE->url);

$sql = "SELECT *
            FROM {competency} c, {competency_coursecomp} ccc
            WHERE c.id = ccc.competencyid
                AND ccc.courseid = ?
            ORDER BY c.shortname ASC";
$params = [ $course->id ];
$coursecomps = $DB->get_records_sql($sql, $params);

$ruleoutcomelist = \core_competency\course_competency::get_ruleoutcome_list();
$ruleoutcomeoptions = [];
foreach ($ruleoutcomelist as $value => $text) {
    $ruleoutcomeoptions[$value] = array('value' => $value, 'text' => (string) $text, 'selected' => false);
}

$frameworks = [];
$pathcomp = [];
$fastmodinfo = get_fast_modinfo($course->id);
foreach ($coursecomps as &$coursecomp) {
    if (empty($frameworks[$coursecomp->competencyframeworkid])) {
        $params = [ 'id' => $coursecomp->competencyframeworkid ];
        $frameworks[$coursecomp->competencyframeworkid] =
            $DB->get_record('competency_framework', $params);
    }
    if (!empty($frameworks[$coursecomp->competencyframeworkid])) {
        $coursecomp->framework = $frameworks[$coursecomp->competencyframeworkid];
    }

    $coursecomp->ruleoutcomeoptions = (array) (object) $ruleoutcomeoptions;
    $coursecomp->ruleoutcomeoptions[$coursecomp->ruleoutcome]['selected'] = true;

    $coursemodules = \core_competency\api::list_course_modules_using_competency($coursecomp->competencyid, $course->id);
    $coursecomp->coursemodules = [];
    foreach ($coursemodules as $cmid) {
        $cminfo = $fastmodinfo->cms[$cmid];
        $coursecomp->coursemodules[] = (object) [
            'iconurl' => $OUTPUT->image_url('icon', $cminfo->modname),
            'name' => $cminfo->name,
            'url' => (!empty($cminfo->url) ? $cminfo->url->__toString() : ''),
        ];
    }
    $coursecomp->hascoursemodules = count($coursecomp->coursemodules);

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
    'cancoursecompetencyconfigure' => $coursecompetencyconfigure,
    'canmanagecoursecompetencies' => $canmanagecoursecompetencies,
    'competencies' => array_values($coursecomps),
    'courseid'     => $course->id,
    'wwwroot'      => $CFG->wwwroot,
];

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_displace/competency/coursecompetencies', $params);
echo $OUTPUT->footer();
