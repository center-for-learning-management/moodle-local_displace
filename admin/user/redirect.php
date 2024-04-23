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
 * @copyright 2023 Austrian Federal Ministry of Education
 * @author    Robert Schrenk
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die;

$handle_if_given = [ 'confirm', 'confirmuser', 'delete', 'suspend', 'unsuspend', 'unlock', 'resendemail' ];
$handle_prevent = false;
foreach ($handle_if_given as $hig) {
    if (!empty(optional_param($hig, '', PARAM_TEXT))) {
        $handle_prevent = true;
    }
}
if (!$handle_prevent) {
    $url = "/local/displace/admin/user/user.php?" . $_SERVER['QUERY_STRING'];
    redirect($url);
}
