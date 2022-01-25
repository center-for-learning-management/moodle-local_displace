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
$course = \get_course($courseid);
$coursecontext = \context_course::instance($courseid);
require_login($course);

$frameworkid = optional_param('frameworkid', 0, PARAM_INT);

\core_competency\api::require_enabled();

$urlparams = array('courseid' => $course->id, 'frameworkid' => $frameworkid);
$PAGE->set_context($coursecontext);
$PAGE->set_url('/local/displace/competency/coursecompetenciesadd.php', $urlparams);
$PAGE->set_title($course->fullname);
$PAGE->set_heading($course->fullname);

$ccurl = new \moodle_url('/local/displace/competency/coursecompetencies.php', [ 'courseid' => $course->id]);
$PAGE->navbar->add(get_string('coursecompetencies', 'tool_lp'), $ccurl);
$PAGE->navbar->add(get_string('addcoursecompetencies', 'tool_lp'), $PAGE->url);

$path = explode('/', $coursecontext->path);
list($insql, $inparams) = $DB->get_in_or_equal($path);
$sql = "SELECT *
            FROM {competency_framework}
            WHERE visible=1
                AND contextid $insql
            ORDER BY shortname ASC";
$frameworks = array_values($DB->get_records_sql($sql, $inparams));
if (empty($frameworks) || count($frameworks) == 0) {
    throw new \moodle_exception('nocompetencyframeworks', 'tool_lp');
}
if (empty($frameworkid)) {
    $frameworkid = $frameworks[0]->id;
}
foreach ($frameworks as &$framework) {
    if ($framework->id == $frameworkid) {
        $framework->selected = 1;
    }
}

require_once("$CFG->dirroot/local/displace/competency/locallib.php");
$competencytree = (object)[];
\local_displace\competency\locallib::build_competency_tree($frameworkid, '/0/', $competencytree);

$params = [
    'competencies' => $competencytree->competencies,
    'courseid'     => $course->id,
    'frameworks'   => $frameworks,
    'wwwroot'      => $CFG->wwwroot,
];

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_displace/competency/coursecompetenciesadd', $params);
echo $OUTPUT->footer();
