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
        $fullname = $DB->sql_fullname();
        $this->set_sql(
            "*,{$fullname} as realname",
            '{user}'
        );

        // Define headers and columns.
        $cols = [
            'userpic' => get_string('userpic'),
            'realname' => get_string('fullname'),
            'firstname' => get_string('firstname'),
            'lastname' => get_string('lastname'),
            'username' => get_string('username'),
            'idnumber' => get_string('idnumber'),
            'lang' => get_string('language'),
            'email' => get_string('email'),
            'emailstop' => get_string('emailstop'),
            'auth' => get_string('authentication'),
            'confirmed' => ucfirst(get_string('confirmed')),
            'deleted' => ucfirst(get_string('deleted')),
            'suspended' => ucfirst(get_string('suspended')),
            'firstaccess' => get_string('firstaccess'),
            'lastaccess' => get_string('lastaccess'),
            'actions' => get_string('actions'),
        ];

        $this->set_table_columns($cols);
        $moodlecols = array_map('trim', explode(',', get_config('core', 'userfiltersdefault')));
        // Add cols that should always be shown.
        $moodlecols[] = 'actions';
        $moodlecols[] = 'userpic';
        // Now calculate the hidden cols.
        $hiddencols = [];
        foreach ($cols as $colname => $collabel) {
            if (!in_array($colname, $moodlecols)) {
                $hiddencols[] = $colname;
            }
        }
        $this->set_hidden_columns($hiddencols);

        $this->collapsible(false);
        $this->sortable(true, 'lastname', SORT_ASC);
        $this->no_sorting('userpic');
        $this->no_filter('userpic');
        $this->no_sorting('actions');
        $this->no_filter('actions');
        $this->no_filter('firstaccess');
        $this->no_filter('lastaccess');

        $yesno = [ 'confirmed', 'deleted', 'emailstop', 'suspended' ];
        foreach ($yesno as $field) {
            $this->set_column_options($field,
                sql_column: $field,
                select_options: [
                    ['text' => get_string('yes'), 'value' => 1],
                    ['text' => get_string('no'), 'value' => 0],
                ]
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

    public function col_firstaccess($row) {
        if ($row->lastaccess) {
            return format_time(time() - $row->firstaccess);
        } else {
            return get_string('never');
        }
    }

    public function col_lastaccess($row) {
        if ($row->lastaccess) {
            return format_time(time() - $row->lastaccess);
        } else {
            return get_string('never');
        }
    }

    public function col_confirmed($row) {
        return $row->confirmed ? get_string('yes') : get_string('no');
    }

    public function col_deleted($row) {
        return $row->deleted ? get_string('yes') : get_string('no');
    }

    public function col_emailstop($row) {
        return $row->emailstop ? get_string('yes') : get_string('no');
    }

    public function col_suspended($row) {
        return $row->suspended ? get_string('yes') : get_string('no');
    }


    public function col_actions($row) {
        global $CFG, $OUTPUT, $PAGE, $USER;
        require_once("$CFG->dirroot/lib/authlib.php");
        require_once("$CFG->dirroot/lib/moodlelib.php");
        $buttons = [];
        if (has_capability('moodle/user:update', \context_system::instance())) {
            if (!$row->deleted) {
                $params = (object)[
                    'icon' => 'fa fa-edit',
                    'label' => get_string('edit'),
                    'url' => new \moodle_url('/user/editadvanced.php', ['id' => $row->id]),
                ];
                $buttons[] = $OUTPUT->render_from_template('local_displace/link', $params);
            }
            if ($row->suspended) {
                $params = (object) [
                    'icon' => 'fa fa-eye-slash',
                    'label' => get_string('unsuspenduser', 'admin'),
                    'url' => new \moodle_url('/admin/user.php', [ 'unsuspend' => $row->id, 'sesskey' => sesskey() ]),
                ];
                $buttons[] = $OUTPUT->render_from_template('local_displace/link', $params);
            } else {
                if ($row->id == $USER->id or is_siteadmin($row)) {
                    // no suspending of admins or self!
                } else {
                    $params = (object) [
                        'icon' => 'fa fa-eye',
                        'label' => get_string('suspenduser', 'admin'),
                        'url' => new \moodle_url('/admin/user.php', [ 'suspend' => $row->id, 'sesskey' => sesskey() ]),
                    ];
                    $buttons[] = $OUTPUT->render_from_template('local_displace/link', $params);
                }
            }
            if (\login_is_lockedout($row)) {
                $params = (object) [
                    'icon' => 'fa fa-unlock',
                    'label' => get_string('unlockaccount', 'admin'),
                    'url' => new \moodle_url('/admin/user.php', [ 'unlock' => $row->id, 'sesskey' => sesskey() ]),
                ];
                $buttons[] = $OUTPUT->render_from_template('local_displace/link', $params);
            }
        }

        if (has_capability('moodle/user:delete', \context_system::instance())) {
            if (\is_mnet_remote_user($row) or $row->id == $USER->id or is_siteadmin($row)) {
                // no deleting of self, mnet accounts or admins allowed
            } else {
                $params = (object) [
                    'icon' => 'fa fa-trash',
                    'label' => get_string('delete'),
                    'url' => new \moodle_url('/admin/user.php', [ 'delete' => $row->id, 'sesskey' => sesskey() ]),
                ];
                $buttons[] = $OUTPUT->render_from_template('local_displace/link', $params);
            }
        }
        return implode(" ", $buttons);
    }

}
