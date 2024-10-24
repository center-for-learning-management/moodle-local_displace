/* eslint-disable */
import $ from 'jquery';
import Ajax from 'core/ajax';
import Notification from 'core/notification';
import Pending from 'core/pending';
import * as Str from 'core/str';
import Config from 'core/config';

var debug = true;
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

  let id = $(a).closest('.competency-row').attr('data-id');

  if (useSessionCompetencies) {
    sessionCompetencies.push(id);
    $(a).closest('.competency-row').addClass('used');
    $(':input[name="session_competencies"]').val(sessionCompetencies.join(','));
    return;
  }

  let method = 'core_competency_add_competency_to_course';
  let data = {'courseid': courseid, 'competencyid': id};
  queue.push({'methodname': method, 'args': data, tr: $(a).closest('.competency-row')});
  $(a).closest('.competency-row').addClass('queue-pending');
  competencyQueue();
};

/**
 * Add/Remove multiple competencies
 * to/from a course.
 * @param {DOMElement} a sender of the event.
 */
async function competencyAddMultiple(a) {
  // Get the first child to decide if we
  // add or remove.
  let tr = $(a).closest('.competency-row');
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
        let shortname = $(a).closest('.competency-row').find('.shortname').html();
        const s = await get_strings([
          {'key': 'competency:remove:title', component: 'local_displace'},
          {'key': 'competency:remove:multiple', component: 'local_displace', param: {'shortname': shortname}},
          {'key': 'yes'},
          {'key': 'no'}
        ]);

        Notification.confirm(
          s[0], s[1], s[2], s[3],
          removeNow
        );
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
 * @param {boolean} confirmed if the user confirmed the action.
 */
async function competencyRemoveSingle(a, confirmed) {
  if (useSessionCompetencies) {
    let id = $(a).closest('.competency-row').attr('data-id');

    sessionCompetencies = sessionCompetencies.filter((value) => value != id);
    $(a).closest('.competency-row').removeClass('used');
    $(':input[name="session_competencies"]').val(sessionCompetencies.join(','));
    return;
  }

  if (typeof confirmed === 'undefined') {
    var shortname = $(a).closest('.competency-row').find('.shortname').html();
    const s = await get_strings([
      {'key': 'competency:remove:title', component: 'local_displace'},
      {'key': 'competency:remove:single', component: 'local_displace', param: {'shortname': shortname}},
      {'key': 'yes'},
      {'key': 'no'}
    ]);

    Notification.confirm(
      s[0], s[1], s[2], s[3],
      function () {
        competencyRemoveSingle(a, true);
      }
    );
  } else {
    if (debug) {
      console.log('Remove single', a);
    }
    let id = $(a).closest('.competency-row').attr('data-id');
    let method = 'core_competency_remove_competency_from_course';
    let data = {'courseid': courseid, 'competencyid': id};
    queue.push({'methodname': method, 'args': data, tr: $(a).closest('.competency-row')});
    $(a).closest('.competency-row').addClass('queue-pending');
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

  let coursecompetencyid = $(select).closest('.competency-row').attr('data-id');
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

function getCurrentFramework() {
  return $('#local_displace-framework-container > *:visible').first();
}

async function loadSelectedFramework() {
  var $select = $('.coursecompetenciesadd select[name="frameworkid"]');
  var selectedText = $select.find("option:selected").text();

  const s = await get_strings([
    {key: 'competency:loading_framework', component: 'local_displace', param: selectedText}
  ]);

  // hide all other frameworks
  $('#local_displace-framework-container > *').hide();

  var frameworkid = $select.val();
  var $existingFramework = $('#local_displace-framework-container > [data-frameworkid="' + frameworkid + '"]');

  if ($existingFramework.length) {
    $existingFramework.show();
  } else {
    // Loading info table
    var $container = $('<div data-frameworkid="' + frameworkid + '">' + s[0] + '</div>').appendTo('#local_displace-framework-container');

    $.get(Config.wwwroot + '/local/displace/competency/coursecompetenciesadd.php?action=competency_selector_tree&courseid=' + courseid + '&frameworkid=' + frameworkid).then(ret => {
      console.log('show with timeout');
      $container.html('');
      $container.append(ret);

      setTimeout(() => initContainer($container), 200);
    });
  }
  // document.location.href = document.location.href.replace(/\?.*/, '') + '?courseid=' + Config.courseId + '&frameworkid=' + this.value;
}

async function get_strings(requests) {
  return Str.get_strings(requests).then(strings => {
    var result = {};
    requests.forEach((str, i) => {
      result[i] = strings[i]; // backwards compatible
      result[str.key] = strings[i];
    });
    return result;
  });
}

/**
 * Initially collapse all competency frameworks.
 * @param {string} uniqid of template.
 */
export function competenciesaddInit() {
  if (debug) {
    console.log('competenciesaddInit');
  }

  $('.coursecompetenciesadd select[name="frameworkid"]').change(function(){
    // clear old search
    var $search = $('.local_displace.competency .simplesearchform :input[type="text"]');
    if ($search.val()) {
      $search.val('').trigger('input');
    }

    loadSelectedFramework();
  });

  $(function () {
    // only load tree if container is visible
    if ($('#local_displace-framework-container').is(':visible')) {
      loadSelectedFramework();
    }
  });

  $('#local_displace-framework-container')
    .on('click', '.has-children .toggler', function (e) {
      e.preventDefault();
      toggleNode(this, null, true);
    })
    // handle other events
    .on('click', '.addsingle', function (e) {
      e.preventDefault();
      competencyAddSingle(this);
    })
    .on('click', '.addmultiple', function (e) {
      e.preventDefault();
      competencyAddMultiple(this);
    })
    .on('click', '.removesingle', function (e) {
      e.preventDefault();
      competencyRemoveSingle(this);
    });

  $(document).on('click', '.local_displace.competency .simplesearchform .clear-button', function () {
    $(this).closest('.clear-button-wrapper').find(':input[type="text"]').val('').trigger('input');
  });

  $(document).on('input', ':input[name="competency-search"]', function () {
    const searchText = this.value.trim();

    var $container = getCurrentFramework();

    $('#local_displace-table-search-not-entries-found-message').addClass('hidden');
    $(this).closest('.clear-button-wrapper').find('.clear-button').toggle(searchText.length > 0);

    var $oldFoundRows = $container.find('.competency-row.is-found');
    $oldFoundRows.removeClass('is-found');

    if (searchText.length <= 2) {
      getRootContainers($container).removeClass('hidden');
      if ($oldFoundRows.length) {
        // leave tree as is
      } else {
        // last search was empty, so show default table

        // first hide and close all
        $container.find('.competency-row.open').removeClass('open');

        // open first level
        getRootContainers($container).each(function () {
          toggleNode(this, true);
        });

        // open used competencies
        $container.find('.competency-row.used').parents('.competency-container').children('.competency-row.has-children').addClass('open');
      }
    } else {
      // first hide and close all
      $container.find('.competency-row.open').removeClass('open');

      getRootContainers($container).addClass('hidden');

      // show found items
      var $foundRows = $container.find('.shortname')
        .filter((index, el) => el.textContent.toLowerCase().includes(searchText.toLowerCase()))
        .closest('.competency-row')
        .addClass('is-found').slice(0, 1000);

      if ($foundRows.length) {
        // then open it and all parents
        $foundRows.parents('.competency-container').children('.competency-row.has-children').addClass('open');
        $container.find('.competency-container.hidden').has('> .competency-row.open').removeClass('hidden');
        $foundRows.filter('.has-children').addClass('open');
      } else {
        $('#local_displace-table-search-not-entries-found-message').removeClass('hidden');
      }
    }
  });
}

// function getParentPath(path) {
//   if (path) {
//     return path.replace(/\/[0-9]+$/, '');
//   }
// }

function getRootContainers($container) {
  if (!$container) {
    $container = getCurrentFramework();
  }

  return $container.find('.competency-root-container').children('.competency-container');
}

function initContainer($container) {
  if (sessionCompetencies.length) {
    sessionCompetencies.forEach((id) => {
      $container.find('.competency-row[data-id=' + id + ']').addClass('used');
    });
  }

  // open first level
  console.log('root container', getRootContainers($container).length, getRootContainers($container));
  getRootContainers($container).each(function () {
      toggleNode(this, true);
    });

  // open used competencies
  $container.find('.competency-row.used').parents('.competency-container').children('.competency-row.has-children').addClass('open');
}

function getChildren(tr) {
  return $(tr).closest('.competency-container').children('.competency-children').children().children('.competency-row');
}

/**
 * Recursively toggle nodes.
 * @param {DOMElement} sender
 */
function toggleNode(sender, open = undefined, animate = false) {
  var $sender = $(sender);
  if ($sender.is('.competency-container')) {
    $sender = $sender.children('.competency-row');
  } else {
    $sender = $sender.closest('.competency-row');
  }
  $sender.toggleClass('open', open);
  return;

  let $tr = $(sender).closest('.competency-row');
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
