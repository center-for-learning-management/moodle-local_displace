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
require_login();

$categoryid = optional_param('categoryid', 0, PARAM_INT);

$topcategory = (object) [
    'id' => 0,
    'name' => !empty($CFG->fullname) ? $CFG->fullname : 'root',
    'parent' => -1,
    'path' => '/',
];

if (!empty($categoryid)) {
    $category = $DB->get_record('course_categories', [ 'id' => $categoryid ], '*', MUST_EXIST);
} else {
    $category = $topcategory;
}

$urlparams = array('categoryid' => $category->id);
$PAGE->set_context(\context_system::instance());
$PAGE->set_url('/local/displace/coursecat/management.php', $urlparams);

$PAGE->set_title($category->name);
$PAGE->set_heading($category->name);

$ccurl = new \moodle_url('/admin/search.php', [ ]);
$PAGE->navbar->add(get_string('administrationsite'), $ccurl);

$ccurl = new \moodle_url('admin/category.php', [ 'category' => 'courses']);
$PAGE->navbar->add(get_string('courses', 'core'), $ccurl);

$ccurl = new \moodle_url('/local/displace/coursecat/management.php', []);
$PAGE->navbar->add(get_string('coursecatmanagement', 'core'), $ccurl);

if (!empty($category->id)) {
    $paths = explode('/', $category->path);
    list($insql, $inparams) = $DB->get_in_or_equal($paths);
    $sql = "SELECT * FROM {course_categories} WHERE id $insql ORDER BY depth ASC";
    $categories = $DB->get_records_sql($sql, $inparams);
    foreach ($categories as $_category) {
        $PAGE->url->param('category', $_category->id);
        $PAGE->navbar->add($_category->name, $PAGE->url);
    }
}

$categories = $DB->get_records('course_categories', [ 'parent' => $category->id], 'name ASC');
$courses = $DB->get_records('course', [ 'category' => $category->id], 'fullname ASC');

foreach ($categories as $category) {
    $ctx = \context_coursecat::instance($category->id);
    $category->contextid = $ctx->id;
}

$params = [
    'categories' => array_values($categories),
    'courses' => array_values($courses),
];

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_displace/coursecat/management', $params);
echo $OUTPUT->footer();
