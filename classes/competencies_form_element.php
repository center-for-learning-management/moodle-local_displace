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
 * @copyright  2024 Austrian Federal Ministry of Education
 * @author     GTN solutions
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_displace;

global $CFG;

require_once($CFG->libdir . '/form/static.php');

if (class_exists('\HTML_QuickForm')) {
    \HTML_QuickForm::registerRule('competencies_fill_value', 'callback', '_fill_value', '\local_displace\competencies_form_element');
}

/**
 * captcha type form element
 *
 * HTML class for a captcha type element
 *
 */
class competencies_form_element extends \MoodleQuickForm_static {
    /**
     * @var bool|null bool: value is valid, null: not yet validated
     */
    protected bool|null $_isValid = null;
    protected ?string $_value = null;

    /**
     * constructor
     *
     * @param string $elementName (optional) name of the captcha element
     * @param string $elementLabel (optional) label for captcha element
     * @param mixed $options (optional) Either a typical HTML attribute string
     *              or an associative array
     */
    public function __construct($elementName, $elementLabel = null, $options = null) {
        if (!$elementLabel) {
            $elementLabel = get_string('competencies', 'local_displace');
        }

        \local_displace\competencylib::prepare_competency_selector();

        parent::__construct($elementName, $elementLabel, '');
    }

    public function setValue($value) {
        $this->_value ??= $value;
        parent::setValue($value);
    }

    public function getValue() {
        return $this->_value;
    }

    /**
     * Returns a 'safe' element's value
     *
     * @param  array   array of submitted values to search
     * @param  bool    whether to return the value as associative array
     * @access public
     * @return mixed
     */
    function exportValue(&$submitValues, $assoc = false)
    {
        $value = $this->_findValue($submitValues);
        if (null === $value) {
            $value = $this->getValue();
        }
        return $this->_prepareValue($value, $assoc);
    }

    public function toHtml(): string {
        global $DB, $COURSE, $OUTPUT;

        $hasError = $this->_isValid === false;
        if (!$hasError && isset($this->form)) {
            $hasError = !empty($this->_form->_errors[$this->getName()]);
        }

        $selectedCompetencies = $this->_value ? explode(',', $this->_value) : [];
        $frameworkid = 0;
        if ($selectedCompetencies) {
            [$in_sql, $in_params] = $DB->get_in_or_equal($selectedCompetencies);

            $sql = "SELECT c.competencyframeworkid
                    FROM {competency} c
                    WHERE c.id $in_sql
                    LIMIT 1
                ";
            $frameworkid = $DB->get_field_sql($sql, $in_params) ?: 0;
        }

        $params = [
            'element' => [
                'id' => $this->getAttribute('id'),
                'name' => $this->getName(),
                // only use the existing value, if it was correct
                'value' => $this->_value,
                'required' => $this->getAttribute('required'),
                // mark as required for screeen readers
                // 'attributes' => 'aria-label="Kompetenzen"',
            ],
            'competencies_output' => ($selectedCompetencies ? $this->render_competencylist($selectedCompetencies) : ''),
            'competencies_selector' => \local_displace\competencylib::render_competency_selector($COURSE->id, $frameworkid, false, $this->getName()),
            'error' => $hasError,
        ];


        return $OUTPUT->render_from_template('local_displace/competencies_form_element', $params);
    }

    public function render_competencylist(array $selectedCompetencies): string {
        global $DB;

        $competenciesByParent = [];
        if (class_exists(\local_komettranslator\locallib::class)) {
            [$in_sql, $in_params] = $DB->get_in_or_equal($selectedCompetencies);

            $sql = "SELECT c.id, c.*
                    FROM {competency} c
                    WHERE c.id $in_sql
                ";
            $competencies = $DB->get_records_sql($sql, $in_params);

            foreach ($competencies as $competence) {
                // Try mapping to exacomp.
                $mapping = \local_komettranslator\api::get_copmetency_mapping( $competence->id, 'descriptor');
                if (!empty($mapping->id) && empty($flagfound[$mapping->sourceid . '_' . $mapping->itemid])) {
                    $title = \local_komettranslator\api::get_competency_longname($competence);

                    $parentName = '';
                    $parent = $competence;
                    while ($parent = $DB->get_record('competency', array('id' => $parent->parentid))) {
                        $parentName = $parent->shortname . ($parentName ? ' / ' . $parentName : '');
                    }
                    if (!isset($competenciesByParent[$parentName])) {
                        $competenciesByParent[$parentName] = [];
                    }
                    $competenciesByParent[$parentName][] = $title;
                }
            }
        }

        ob_start();

        if ($competenciesByParent) {
            foreach ($competenciesByParent as $parentName => $competencies) {
                ?>
                <div style="font-weight: bold; margin: 12px 0 4px 0"><?= $parentName ?>:</div>
                <ul>
                    <?= join('', array_map(fn($k) => "<li>{$k}</li>", $competencies)) ?>
                </ul>
                <?php
            }
        }

        return ob_get_clean();
    }

    /**
     * Called by HTML_QuickForm whenever form event is made on this element.
     * Adds necessary rules to the element and checks that coorenct instance of gradingform_instance
     * is passed in attributes
     *
     * @param string $event Name of event
     * @param mixed $arg event arguments
     * @param object $caller calling object
     * @return bool
     * @throws moodle_exception
     */
    public function onQuickFormEvent($event, $arg, &$caller) {
        // remember the form for later
        $this->form = $caller;

        $caller->setType($this->getName(), PARAM_TEXT);

        $name = $this->getName();
        if ($name && $caller->elementExists($name)) {
            if (empty($caller->_rules[$this->getName()])) {
                // rule wasn't already added
                $caller->addRule($name, 'some_rule_name', 'competencies_fill_value', [
                    'element' => $this,
                ]);
            }
        }

        return parent::onQuickFormEvent($event, $arg, $caller);
    }

    /**
     * Function registered as rule for this element and is called when this element is being validated.
     * This is a wrapper to pass the validation to the method gradingform_instance::validate_grading_element
     *
     * @param mixed $elementValue value of element to be validated
     * @param array $attributes element attributes
     */
    public static function _fill_value($elementValue, $attributes = null) {
        // $attributes is filled in "addRule()" above
        $attributes['element']->setValue($elementValue);

        return true;
    }
}
