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

namespace local_displace\admin\user;

use local_table_sql\table_sql;

defined('MOODLE_INTERNAL') || die;

require_once("$CFG->libdir/tablelib.php");

class table extends table_sql {
    /**
     * Setup the headers for the table.
     */
    protected function define_table_configs() {
        global $DB;

        $this->set_sql(
            '*',
            "SELECT * FROM {user}",
            []
        );

        // Define headers and columns.
        $cols = [
            'userpic' => get_string('userpic'),
            'firstname' => get_string('firstname'),
            'lastname' => get_string('lastname'),
            'email' => get_string('email'),
            'lastaccess' => get_string('lastaccess'),
        ];

        $this->set_table_columns($cols);

        $this->collapsible(false);
        $this->sortable(true, 'lastname', SORT_ASC);
        $this->no_sorting('userpic');
        $this->no_filter('userpic');
        $this->no_filter('lastaccess');

        if (has_capability('moodle/user:update', \context_system::instance())) {
            $this->add_row_action(
                url: new moodle_url('/user/editadvanced.php', [ 'id' => '{id}' ]),
                label: get_string('edit'),
                icon: "fa fa-edit"
            );
        }
        if (has_capability('moodle/user:delete', \context_system::instance())) {
            $this->add_row_action(
                url: new moodle_url('/user/editadvanced.php', [ 'id' => '{id}' ]),
                label: get_string('edit'),
                icon: "fa fa-edit"
            );
        }
    }

    public function col_userpic($row) {
        global $OUTPUT;
        return $OUTPUT->user_picture($row, array('size' => 35));
    }

    public function col_firstname($row) {
        return $row->firstname;
    }

    public function col_lastname($row) {
        return $row->lastname;
    }

    public function col_email($row) {
        global $OUTPUT, $USER;
        if ($this->is_downloading()) {
            return $row->email;
        }
        return "<a href=\"mailto:{$row->email}\">{$row->email}</a>";
    }

    public function col_lastaccess($row) {
        if ($row->lastaccess) {
            return format_time(time() - $row->lastaccess);
        } else {
            return get_string('never');
        }
    }

    public function col_actions($row) {
        global $USER;
        if ($row->suspended) {
            $url = new moodle_url($returnurl, array('unsuspend'=>$row->id, 'sesskey'=>sesskey()));
            $buttons[] = html_writer::link($url, $OUTPUT->pix_icon('t/show', $strunsuspend));
        } else {
            if ($row->id == $USER->id or is_siteadmin($row)) {
                // no suspending of admins or self!
            } else {
                $url = new moodle_url($returnurl, array('suspend'=>$row->id, 'sesskey'=>sesskey()));
                $buttons[] = html_writer::link($url, $OUTPUT->pix_icon('t/hide', $strsuspend));
            }
        }

        if (login_is_lockedout($row)) {
            $url = new moodle_url($returnurl, array('unlock'=>$row->id, 'sesskey'=>sesskey()));
            $buttons[] = html_writer::link($url, $OUTPUT->pix_icon('t/unlock', $strunlock));
        }
    }

}
