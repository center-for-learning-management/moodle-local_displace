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
$frameworkid = optional_param('frameworkid', 0, PARAM_INT);

$urlparams = array('courseid' => $courseid, 'frameworkid' => $frameworkid);
$PAGE->set_url('/local/displace/competency/coursecompetenciesadd.php', $urlparams);

if ($courseid) {
    $course = \get_course($courseid);
    $coursecontext = \context_course::instance($courseid);
    require_login($course);
    \core_competency\api::require_enabled();
    require_capability('moodle/competency:coursecompetencymanage', $coursecontext);

    \core_competency\api::require_enabled();

    $PAGE->set_context($coursecontext);
    $PAGE->set_title($course->fullname);
    $PAGE->set_heading($course->fullname);

    $ccurl = new \moodle_url('/local/displace/competency/coursecompetencies.php', ['courseid' => $course->id]);
    $PAGE->navbar->add(get_string('coursecompetencies', 'tool_lp'), $ccurl);
    $PAGE->navbar->add(get_string('addcoursecompetencies', 'tool_lp'), $PAGE->url);
} else {
    $PAGE->set_context(\context_system::instance());
}

if (optional_param('action', '', PARAM_TEXT) == 'competency_selector_tree') {
    echo \local_displace\competencylib::render_competency_selector_tree($courseid, $frameworkid);

    exit;
}

$output = \local_displace\competencylib::render_competency_selector($courseid, $frameworkid);

echo $OUTPUT->header();

echo $output;

echo $OUTPUT->footer();
