/* eslint-disable */
import $ from 'jquery';
import Ajax from 'core/ajax';
import Notification from 'core/notification';
import Pending from 'core/pending';
import * as Str from 'core/str';
import Config from 'core/config';

var debug = false;
var queue = [];
var queueActiveItem = false;

const courseid = Config.courseId > 1 ? Config.courseId : 0;
const useSessionCompetencies = !courseid;
let sessionCompetencies = [];

const sessionCompetenciesTmp = $(':input[name="session_competencies"]').val();
if (sessionCompetenciesTmp) {
  sessionCompetencies = sessionCompetenciesTmp.split(',');
}

/**
 * Add a single competency to a course.
 * @param {DOMElement} a sender of the event.
 */
function competencyAddSingle(a) {
  if (debug) {
    console.log('Add single', a);
  }

  let id = $(a).closest('tr').attr('data-id');

  if (useSessionCompetencies) {
    sessionCompetencies.push(id);
    $(a).closest('tr').addClass('used');
    $(':input[name="session_competencies"]').val(sessionCompetencies.join(','));
    return;
  }

  let method = 'core_competency_add_competency_to_course';
  let data = {'courseid': courseid, 'competencyid': id};
  queue.push({'methodname': method, 'args': data, 'tr': $(a).closest('tr')});
  $(a).closest('tr').addClass('queue-pending');
  competencyQueue();
};

/**
 * Add/Remove multiple competencies
 * to/from a course.
 * @param {DOMElement} a sender of the event.
 */
function competencyAddMultiple(a) {
  // Get the first child to decide if we
  // add or remove.
  let tr = $(a).closest('tr');
  let id = tr.attr('data-id');

  let children = getChildren(tr);

  if (children.length > 0) {
    // falls einer noch nicht ausgewählt ist, alle auswählen, sonst alle abwählen
    var selectAll = children.filter(':not(.used)').length > 0;

    toggleNode(tr, true, true);

    if (selectAll) {
      children.not('.used').each(function () {
        competencyAddSingle($(this).find('.addsingle'));
      });
    } else {
      function removeNow() {
        children.filter('.used').each(function () {
          competencyRemoveSingle($(this).find('.removesingle'), true);
        });
      }

      if (useSessionCompetencies) {
        removeNow();
      } else {
        let shortname = $(a).closest('tr').find('.shortname').html();
        Str.get_strings([
          {'key': 'competency:remove:title', component: 'local_displace'},
          {'key': 'competency:remove:multiple', component: 'local_displace', param: {'shortname': shortname}},
          {'key': 'yes'},
          {'key': 'no'}
        ]).done(function (s) {
          Notification.confirm(
            s[0], s[1], s[2], s[3],
            removeNow
          );
        }).fail(Notification.exception);
      }
    }

    if (useSessionCompetencies) {
      $(':input[name="session_competencies"]').val(sessionCompetencies.join(','));
    }
  }
}

/**
 * Remove a single competency from a course.
 * @param {DOMElement} a sender of the event.
 * @param {bool} confirmed if the user confirmed the action.
 */
function competencyRemoveSingle(a, confirmed) {
  if (useSessionCompetencies) {
    let id = $(a).closest('tr').attr('data-id');

    sessionCompetencies = sessionCompetencies.filter((value) => value != id);
    $(a).closest('tr').removeClass('used');
    $(':input[name="session_competencies"]').val(sessionCompetencies.join(','));
    return;
  }

  if (typeof confirmed === 'undefined') {
    var shortname = $(a).closest('tr').find('.shortname').html();
    Str.get_strings([
      {'key': 'competency:remove:title', component: 'local_displace'},
      {'key': 'competency:remove:single', component: 'local_displace', param: {'shortname': shortname}},
      {'key': 'yes'},
      {'key': 'no'}
    ]).done(function (s) {
        Notification.confirm(
          s[0], s[1], s[2], s[3],
          function () {
            competencyRemoveSingle(a, true);
          }
        );
      }
    ).fail(Notification.exception);
  } else {
    if (debug) {
      console.log('Remove single', a);
    }
    let id = $(a).closest('tr').attr('data-id');
    let method = 'core_competency_remove_competency_from_course';
    let data = {'courseid': courseid, 'competencyid': id};
    queue.push({'methodname': method, 'args': data, 'tr': $(a).closest('tr')});
    $(a).closest('tr').addClass('queue-pending');
    competencyQueue();
  }
}

/**
 * Handles the next item in queue.
 */
function competencyQueue() {
  if (queueActiveItem) {
    return;
  }
  if (queue.length == 0) {
    return;
  }
  let item = queue.shift();
  if (debug) {
    console.log('Queue Item', item);
  }
  queueActiveItem = true;
  Ajax.call([{
    methodname: item.methodname,
    args: item.args,
    done: function (result) {
      $(item.tr).removeClass('queue-pending');
      if (debug) {
        console.log('Results of ' + item.methodname, result);
      }
      if (result) {
        if (item.methodname == 'core_competency_add_competency_to_course') {
          $(item.tr).addClass('used');
        } else {
          $(item.tr).removeClass('used');
        }
        $(item.tr).addClass('displace-alert success');
        setTimeout(
          function () {
            $(item.tr).removeClass('displace-alert success');
          }, 1000
        );
      } else {
        $(item.tr).addClass('displace-alert danger');
      }
      queueActiveItem = false;
      competencyQueue();
    },
    fail: function (ex) {
      $(item.tr).addClass('displace-alert danger');
      queueActiveItem = false;
      Notification.exception(ex);
    }
  }]);
}

/**
 * Sets the rule outcome option.
 * @param {DOMElement} select
 */
export function setRuleOutcomeOption(select) {
  let pendingPromise = new Pending();
  let requests = [];

  let coursecompetencyid = $(select).closest('tr').attr('data-id');
  let ruleoutcome = $(select).val();
  requests = Ajax.call([
    {
      methodname: 'core_competency_set_course_competency_ruleoutcome',
      args: {coursecompetencyid: coursecompetencyid, ruleoutcome: ruleoutcome}
    },
    {
      methodname: 'tool_lp_data_for_course_competencies_page',
      args: {courseid: $(select).closest('table').attr('data-courseid'), moduleid: 0}
    }
  ]);
  requests[1].then(function () {
    $(select).addClass('displace-alert success');
    setTimeout(
      function () {
        $(select).removeClass('displace-alert success');
      },
      1000
    );
  })
    .then(pendingPromise.resolve);
}

function getCurrentTable() {
  return $('.coursecompetenciesadd_framework:visible').first();
}

function loadSelectedFramework() {
  var $select = $('.coursecompetenciesadd select[name="frameworkid"]');
  var selectedText = $select.find("option:selected").text();

  var $existingFramework = $('.coursecompetenciesadd_framework[data-frameworkid=' + $select.val() + ']');

  // hide all other frameworks
  $('#local_displace-framework-container').children().hide();

  if ($existingFramework.length) {
    $existingFramework.show();
  } else {
    // Loading info table
    var $loadingInfoTable = $('<div class="coursecompetenciesadd_framework" data-frameworkid="' + $select.val() + '">Lade ' + selectedText + '...</div>');
    $loadingInfoTable.appendTo('#local_displace-framework-container');

    $.get(Config.wwwroot + '/local/displace/competency/coursecompetenciesadd.php?action=competency_selector_tree&courseid=' + courseid + '&frameworkid=' + $select.val()).then(ret => {
      var $newTable = $(ret);

      $loadingInfoTable.after($newTable);
      $newTable.toggle($loadingInfoTable.is(':visible'));
      $loadingInfoTable.remove();

      initTable($newTable);
    });
  }
  // document.location.href = document.location.href.replace(/\?.*/, '') + '?courseid=' + Config.courseId + '&frameworkid=' + this.value;
}

/**
 * Initially collapse all competency frameworks.
 * @param {string} uniqid of template.
 */
export function competenciesaddInit() {
  if (debug) {
    console.log('competenciesaddInit');
  }

  $('.coursecompetenciesadd select[name="frameworkid"]').change(loadSelectedFramework)

  if ($('#local_displace-framework-container').is(':visible')) {
    // only load tree if container is visible
    loadSelectedFramework();
  }

  $(document).on('input', ':input[name="competency-search"]', function () {
    const searchText = this.value.trim();

    var $table = getCurrentTable();
    console.log('input');

    $('#local_displace-table-search-not-entries-found-message').addClass('hidden');

    if (!searchText) {
      if ($table.find('tr[data-id]:visible').length == 0) {
        // last search was empty, so show default table
        // show first level
        getCurrentTable().find('tr').filter(function () {
          return getParentPath($(this).attr('data-fullpath')) == '/0';
        })
          .removeClass('hidden')
          // also open first level
          .each(function () {
            toggleNode(this, true);
          });
      } else {
        $table.find('tr[data-id]')
          .removeClass('is-found');
      }
    } else {
      // first hide and close all
      $table.find('tr[data-id]')
        .addClass('hidden')
        .removeClass('is-found')
        .removeClass('children-visible')
        .find('.fa-folder').removeClass('fa-folder-open');

      // show found items
      $table.find('.shortname')
        .filter((index, el) => el.textContent.toLowerCase().includes(searchText.toLowerCase()))
        .closest('tr')
        .addClass('is-found')
        // then open it and all parents
        .each((index, el) => {
          var $tr = $(el);

          do {
            $tr.removeClass('hidden');
            toggleNode($tr, true);
          } while ($tr = getParent($tr));
        });

      if ($table.find('tr[data-id]:visible').length == 0) {
        $('#local_displace-table-search-not-entries-found-message').removeClass('hidden');
      }
    }
  });
}

function getParentPath(path) {
  if (path) {
    return path.replace(/\/[0-9]+$/, '');
  }
}

function initTable($table) {
  if (sessionCompetencies.length) {
    sessionCompetencies.forEach((id) => {
      $table.find('tr[data-id=' + id + ']').addClass('used');
    });
  }

  // styles for animation
  // Idee: den content der TDs in ein DIV wrappen, welches mit der Höhe animiert wird
  // weil animation der Höhe mit overflow auf TDs nicht funktioniert
  // zusätzlich das padding entfernen und dieses auf den sliding-wrapper-inner übertragen
  $table.find('tr td')
    .each(function () {
      if ($(this).children().length) {
        $(this).children().wrapAll('<div class="sliding-wrapper-inner"></div>');
      } else {
        $(this).append('<div class="sliding-wrapper-inner"></div>');
      }

      var $wrapperInner = $(this).find('.sliding-wrapper-inner');
      $wrapperInner.wrap('<div class="sliding-wrapper"></div>');

      $wrapperInner.css('padding', $(this).css('padding'));
      $wrapperInner.css('border-top', $(this).css('border-top'));
    })
    .css('padding', '0')
    .css('border-top', 'none')

  // show first level
  $table.find('tr').filter(function () {
    return getParentPath($(this).attr('data-fullpath')) == '/0';
  })
    .removeClass('hidden')
    // also open first level
    .each(function () {
      toggleNode(this, true);
    });

  // open used competencies
  $table.find('tr.used').each(function () {
    toggleInitRecursive(this);
  });

  // handle toggle click
  $table.find('tr.has-children .toggler').click(function () {
    toggleNode(this, null, true);
  })

  // handle other events
  $table.find('.addsingle').click(function () {
    competencyAddSingle(this);
  });

  $table.find('.addmultiple').click(function () {
    competencyAddMultiple(this);
  });

  $table.find('.removesingle').click(function () {
    competencyRemoveSingle(this);
  });
}

function getParent(tr) {
  var $tr = $(tr);

  let $parent = $(tr).closest('table').find('tr[data-fullpath="' + getParentPath($tr.attr('data-fullpath')) + '"]');
  if ($parent.length > 0) {
    return $parent;
  }
}

function getChildren(tr) {
  var $tr = $(tr);

  const parentPath = $tr.attr('data-fullpath');

  return $(tr).closest('table').find('tr[data-fullpath^="' + $tr.attr('data-fullpath') + '/"]')
    .filter(function () {
      return getParentPath($(this).attr('data-fullpath')) == parentPath;
    });
}

/**
 * Toggle recursively nodes by their parents.
 * @param {DOMElement} tr to start with.
 */
function toggleInitRecursive(tr) {
  var $tr = $(tr);

  do {
    $tr.removeClass('hidden');
    toggleNode($tr, true);
  } while ($tr = getParent($tr));
}

/**
 * Recursively toggle nodes.
 * @param {DOMElement} sender
 */
function toggleNode(sender, open = undefined, animate = false) {
  let $tr = $(sender).closest('tr');
  let $table = $tr.closest('table');

  if (open === null || open === undefined) {
    open = !$tr.hasClass('children-visible');
  }
  let close = !open;

  // do open/close only if it isn't already opened/closed
  close = close && $tr.hasClass('children-visible');
  open = open && !$tr.hasClass('children-visible');

  if (close) {
    $tr
      .removeClass('children-visible')
      .find('.fa-folder').removeClass('fa-folder-open');

    // Make all children hidden.
    var $children = $table.find('tr[data-fullpath^="' + $tr.attr('data-fullpath') + '/"]').not('.hidden');
    if (!animate) {
      $children.addClass('hidden');
    } else {
      var $wrapper = $children.find('.sliding-wrapper')
      const height = $wrapper.outerHeight(); // Get current height
      $wrapper.css('max-height', height); // Set height for transition
      setTimeout(() => {
        $wrapper.css('max-height', 0); // Animate to height 0
        setTimeout(() => {
          $children.addClass('hidden');
          $wrapper.css('max-height', '');
        }, 500); // Remove element from layout
      }, 10); // Timeout for
    }
  }

  if (open) {
    $tr
      .addClass('children-visible')
      .find('.fa-folder').addClass('fa-folder-open');

    // Make direct children visible and children of the children if they are open too.
    var $children = getChildren($tr);
    var $all = getChildren($tr);

    do {
      $children = $children.filter('.children-visible');

      // get all subchildren in an array
      $children = $children.map(function () {
        return $children = getChildren(this).toArray()
      });

      $all = $all.add($children);
    } while ($children.length > 0)

    $children = $all;

    if (!animate) {
      $children.removeClass('hidden');
    } else {
      var $wrapper = $children.find('.sliding-wrapper')
      $children.removeClass('hidden');
      const height = 100; // Get current height
      // const height = $wrapper.outerHeight(); // Get current height
      $wrapper.css('max-height', 10); // Set height for transition
      setTimeout(() => {
        $wrapper.css('max-height', height);
        setTimeout(() => {
          $wrapper.css('max-height', '');
        }, 500); // Remove element from layout
      }, 10); // Timeout for
    }
  }
}
