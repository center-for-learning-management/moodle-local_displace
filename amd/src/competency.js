/* eslint-disable */
import $ from 'jquery';
import Ajax from 'core/ajax';
import Notification from 'core/notification';
import Pending from 'core/pending';
import * as Str from 'core/str';
import Config from 'core/config';

const debug = false;

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Escape regular expression special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get strings from the server.
 * @param {array} requests requested strings
 * @returns {Promise<*>}
 */
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

const getOnceCache = {};

async function getOnce(url) {
  const cache = getOnceCache;

  // Check if there's an ongoing request or a cached result for the URL
  if (cache[url]) {
    return cache[url];
  }

  // Start a new request and store the promise in the cache
  cache[url] = $.get(url)
    .then(html => {
      cache[url] = Promise.resolve(html); // Update cache with the final result
      return html;
    })
    .catch(error => {
      delete cache[url]; // Remove from cache if the request fails
      throw error;
    });

  // Return the ongoing or completed request
  return cache[url];
}

/**
 * Initially collapse all competency frameworks.
 * @param {object} config
 */
export function competenciesSelectorInit(config) {
  if (debug) {
    console.log('competenciesSelectorInit');
  }

  const queue = [];
  let queueActiveItem = false;

  const useSessionCompetencies = !!config.session_competencies_input;
  const courseid = Config.courseId > 1 && !useSessionCompetencies ? Config.courseId : 0;
  const $sessionCompetenciesInput = config.session_competencies_input ? $('input[name="' + config.session_competencies_input + '"]') : $();
  let sessionCompetencies = [];

  const sessionCompetenciesTmp = $sessionCompetenciesInput.val();
  if (sessionCompetenciesTmp) {
    sessionCompetencies = $sessionCompetenciesInput.val().split(',');
  }

  const $competenciesSelectorContainer = $('#' + config.id);
  const $frameworkSelect = $competenciesSelectorContainer.find('select[name="frameworkid"]');
  const $searchInput = $competenciesSelectorContainer.find('.simplesearchform :input[type="text"]');

  $frameworkSelect.change(function () {
    // clear old search
    if ($searchInput.val()) {
      $searchInput.val('').trigger('input');
      updateSearch();
    }

    loadSelectedFramework();
  });

  $(function () {
    // only load tree if container is visible
    if ($competenciesSelectorContainer.is(':visible')) {
      loadSelectedFramework();
    } else {
      var interval = setInterval(function () {
        if ($competenciesSelectorContainer.is(':visible')) {
          clearInterval(interval);
          loadSelectedFramework();
        }
      }, 300);
    }
  });

  $competenciesSelectorContainer
    .on('click', '.has-children .toggler', function (e) {
      e.preventDefault();
      toggleNode(this, null);
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

  $competenciesSelectorContainer.on('click', '.simplesearchform .clear-button', function () {
    $(this).closest('.clear-button-wrapper').find(':input[type="text"]').val('').trigger('input').focus();
    updateSearch();
  });

  $competenciesSelectorContainer.on('click', '.' +
    'simplesearchform button', function () {
    updateSearch();
  });

  $searchInput
    .on('keypress', function (e) {
      if (e.which === 13) {  // 13 is the Enter key code
        // Action to perform when Enter is pressed
        e.preventDefault();
        updateSearch();
      }
    })
    .on('input', function () {
      const searchText = this.value.trim();
      $(this).closest('.clear-button-wrapper').find('.clear-button').toggle(searchText.length > 0);
    });

  /**
   * Add a single competency to a course.
   * @param {HTMLElement} a sender of the event.
   */
  function competencyAddSingle(a) {
    if (debug) {
      console.log('Add single', a);
    }

    let id = $(a).closest('.competency-row').attr('data-id');

    if (useSessionCompetencies) {
      sessionCompetencies.push(id);
      $(a).closest('.competency-row').addClass('used');
      $sessionCompetenciesInput.val(sessionCompetencies.join(','));
      return;
    }

    let method = 'core_competency_add_competency_to_course';
    let data = {'courseid': courseid, 'competencyid': id};
    queue.push({'methodname': method, 'args': data, row: $(a).closest('.competency-row')});
    $(a).closest('.competency-row').addClass('queue-pending');
    competencyQueue();
  }

  /**
   * Add/Remove multiple competencies
   * to/from a course.
   * @param {HTMLElement} a sender of the event.
   */
  async function competencyAddMultiple(a) {
    // Get the first child to decide if we
    // add or remove.
    let row = $(a).closest('.competency-row');
    let children = getChildren(row)
      // nur sichtbare hinzufügen, weil aufgrund der suche ggf welche versteckt sind
      .filter(function () {
        return $(this).closest('.hidden').length === 0;
      });

    /**
     * mark children as removed
     */
    function removeNow() {
      children.filter('.used').each(function () {
        competencyRemoveSingle($(this).find('.removesingle'), true);
      });
    }

    if (children.length > 0) {
      // falls einer noch nicht ausgewählt ist, alle auswählen, sonst alle abwählen
      var selectAll = children.filter(':not(.used)').length > 0;

      toggleNode(row, true);

      if (selectAll) {
        children.not('.used').each(function () {
          competencyAddSingle($(this).find('.addsingle'));
        });
      } else {
        if (useSessionCompetencies) {
          removeNow();
        } else {
          let shortname = $(a).closest('.competency-row').find('.shortname').html();
          const s = await get_strings([
            {'key': 'competency:remove:title', component: 'local_displace'},
            {'key': 'competency:remove:multiple', component: 'local_displace', param: {shortname}},
            {'key': 'yes'},
            {'key': 'no'}
          ]);

          Notification.confirm(
            s[0], s[1], s[2], s[3],
            removeNow
          );
        }
      }
    }
  }

  /**
   * Remove a single competency from a course.
   * @param {HTMLElement} el sender of the event.
   * @param {boolean} confirmed if the user confirmed the action.
   */
  async function competencyRemoveSingle(el, confirmed = false) {
    if (useSessionCompetencies) {
      let id = $(el).closest('.competency-row').attr('data-id');

      sessionCompetencies = sessionCompetencies.filter((value) => value != id);
      $(el).closest('.competency-row').removeClass('used');
      $sessionCompetenciesInput.val(sessionCompetencies.join(','));
      return;
    }

    if (!confirmed) {
      var shortname = $(el).closest('.competency-row').find('.shortname').html();
      const s = await get_strings([
        {'key': 'competency:remove:title', component: 'local_displace'},
        {'key': 'competency:remove:single', component: 'local_displace', param: {shortname}},
        {'key': 'yes'},
        {'key': 'no'}
      ]);

      Notification.confirm(
        s[0], s[1], s[2], s[3],
        function () {
          competencyRemoveSingle(el, true);
        }
      );
    } else {
      if (debug) {
        console.log('Remove single', el);
      }
      let id = $(el).closest('.competency-row').attr('data-id');
      let method = 'core_competency_remove_competency_from_course';
      let data = {'courseid': courseid, 'competencyid': id};
      queue.push({'methodname': method, 'args': data, row: $(el).closest('.competency-row')});
      $(el).closest('.competency-row').addClass('queue-pending');
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
        if (document.location.href.match(/coursecompetencies.php/)) {
          // competencies list, remove the row
          $(item.row).fadeOut(500, function () {
            $(this).remove(); // Remove the <tr> from the DOM after fading out
          });
        } else {
          $(item.row).removeClass('queue-pending');
          if (debug) {
            console.log('Results of ' + item.methodname, result);
          }
          if (result) {
            if (item.methodname == 'core_competency_add_competency_to_course') {
              $(item.row).addClass('used');
            } else {
              $(item.row).removeClass('used');
            }
            $(item.row).addClass('displace-alert success');
            setTimeout(
              function () {
                $(item.row).removeClass('displace-alert success');
              }, 1000
            );
          } else {
            $(item.row).addClass('displace-alert danger');
          }
        }

        queueActiveItem = false;
        competencyQueue();
      },
      fail: function (ex) {
        $(item.row).addClass('displace-alert danger');
        queueActiveItem = false;
        Notification.exception(ex);
      }
    }]);
  }

  /**
   * Get the currently visible framework
   * @returns {jQuery}
   */
  function getCurrentFramework() {
    return $competenciesSelectorContainer.find('.local_displace-framework-container > *:visible').first();
  }

  /**
   * get containers for all root nodes
   * @param {jQuery?} $container
   * @returns {*}
   */
  function getRootContainers($container) {
    if (!$container) {
      $container = getCurrentFramework();
    }

    return $container.find('.competency-root-container').children('.competency-container');
  }

  /**
   * get all children of a competency
   * @param {jQuery} row the competency row
   * @returns {jQuery}
   */
  function getChildren(row) {
    return $(row).closest('.competency-container').children('.competency-children').children().children('.competency-row');
  }

  /**
   * Load the selected framework
   * @returns {Promise<void>}
   */
  async function loadSelectedFramework() {
    var selectedText = $frameworkSelect.find("option:selected").text();

    const s = await get_strings([
      {key: 'competency:loading_framework', component: 'local_displace', param: selectedText}
    ]);

    // hide all other frameworks
    $competenciesSelectorContainer.find('.local_displace-framework-container > *').hide();

    var frameworkid = $frameworkSelect.val();
    var $existingFramework = $competenciesSelectorContainer.find('.local_displace-framework-container > [data-frameworkid="' + frameworkid + '"]');

    if ($existingFramework.length) {
      $existingFramework.show();
    } else {
      // Loading info table
      var $container = $('<div data-frameworkid="' + frameworkid + '">' + s[0] + '</div>')
        .appendTo($competenciesSelectorContainer.find('.local_displace-framework-container'));

      const ret = await getOnce(Config.wwwroot + '/local/displace/competency/coursecompetenciesadd.php?action=competency_selector_tree&courseid=' +
        courseid + '&frameworkid=' + frameworkid);
      $container.html('');
      $container.append(ret);

      sessionCompetencies.forEach((id) => {
        $container.find('.competency-row[data-id=' + id + ']').addClass('used');
      });

      if (debug) {
        console.log('root container', getRootContainers($container).length, getRootContainers($container));
      }

      openDefaultNodes();
    }
  }

  /**
   * Update the search results.
   */
  function updateSearch() {
    const searchText = $searchInput.val().trim();

    const $container = getCurrentFramework();

    $competenciesSelectorContainer.find('.local_displace-table-search-not-entries-found-message').addClass('hidden');
    $competenciesSelectorContainer.find('.local_displace-table-search-more-entries-found').addClass('hidden');

    const $oldFoundRows = $container.find('.competency-row.is-found');
    $oldFoundRows.removeClass('is-found');
    $oldFoundRows.find('.shortname.highlighted').remove();

    if (searchText.length == 0) {
      // alle Elemente anzeigen
      $container.find('.competency-container.hidden').removeClass('hidden');
      // getRootContainers($container).removeClass('hidden');

      if ($oldFoundRows.length) {
        // leave tree as is
      } else {
        // last search was empty, so show default table

        // first hide and close all
        $container.find('.competency-row.open').removeClass('open');

        openDefaultNodes();
      }
    } else {
      // first hide and close all
      $container.find('.competency-row.open').removeClass('open');
      $container.find('.competency-container').addClass('hidden');

      const searchParts = searchText.toLowerCase().split(/\s+/);

      // show found items
      var $foundRows = $container.find('.shortname')
        .filter((index, el) => {
          var text = el.textContent.toLowerCase();
          return searchParts.every(part => text.includes(part));
        })
        .closest('.competency-row');

      const maxFound = 300;
      const moreFound = $foundRows.length > maxFound;
      $foundRows = $foundRows.slice(0, maxFound);

      if ($foundRows.length) {
        // mark them found
        $foundRows.addClass('is-found');
        // then open it and all parents
        $foundRows.parents('.competency-container').children('.competency-row.has-children').addClass('open');
        // show container and all parent containers
        $foundRows.parents('.competency-container').removeClass('hidden');
        // if a parent is found, show all children
        $foundRows.closest('.competency-container').find('.competency-container.hidden').removeClass('hidden');

        // highlight text inside the row
        const escapedStr = searchParts.map(part => escapeRegExp(escapeHTML(part))).join('|');
        const regexp = new RegExp(`(${escapedStr})`, 'gi');
        $foundRows.find('.shortname').each(function (index, el) {
          // replace each part with a <mark/> tag
          $('<span class="shortname highlighted">' + el.textContent.replace(regexp, '<mark>$1</mark>') + '</span>').insertBefore(el);
        });

        if (moreFound) {
          $competenciesSelectorContainer.find('.local_displace-table-search-more-entries-found').removeClass('hidden')
            .find('.num').html(maxFound);
        }
      } else {
        $competenciesSelectorContainer.find('.local_displace-table-search-not-entries-found-message').removeClass('hidden');
      }
    }
  }

  /**
   * Open all used competencies or at least first level
   */
  function openDefaultNodes() {
    const $container = getCurrentFramework();

    // open used competencies
    $container.find('.competency-row.used').parents('.competency-container').children('.competency-row.has-children')
      .addClass('open');

    if (!document.location.href.match(/package_edit.php/) && $container.find('.open').length == 0) {
      // erste ebene öffnen, aber nicht auf der package_edit.php, weil sonst wird die Liste zu lange
      // und auch nicht, wenn schon Elemente ausgewählt sind
      getRootContainers($container).each(function () {
        toggleNode(this, true);
      });
    }
  }

  /**
   * Recursively toggle nodes.
   * @param {HTMLElement} el the node to toggle
   * @param {boolean} open
   */
  function toggleNode(el, open = undefined) {
    var $el = $(el);
    if ($el.is('.competency-container')) {
      $el = $el.children('.competency-row');
    } else {
      $el = $el.closest('.competency-row');
    }
    $el.toggleClass('open', open);
  }
}

/**
 * Sets the rule outcome option.
 * @param {HTMLElement} select
 */
export function setRuleOutcomeOption(select) {
  let pendingPromise = new Pending();
  let requests = [];

  let coursecompetencyid = $(select).closest('.competency-row').attr('data-coursecompetencyid');
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

/**
 * Remove a single competency from a course and hide it from the list.
 * @param {HTMLElement} el
 * @returns {Promise<void>}
 */
export async function competencyRemoveFromList(el, confirmed = false) {
  if (!confirmed) {
    var shortname = $(el).closest('.competency-row').find('.shortname').html();
    const s = await get_strings([
      {'key': 'competency:remove:title', component: 'local_displace'},
      {'key': 'competency:remove:single', component: 'local_displace', param: {shortname}},
      {'key': 'yes'},
      {'key': 'no'}
    ]);

    Notification.confirm(
      s[0], s[1], s[2], s[3],
      function () {
        competencyRemoveFromList(el, true);
      }
    );
  } else {
    if (debug) {
      console.log('Remove single', el);
    }
    let id = $(el).closest('.competency-row').attr('data-id');
    let method = 'core_competency_remove_competency_from_course';
    let data = {'courseid': Config.courseId, 'competencyid': id};
    let $row = $(el).closest('.competency-row');
    $row.addClass('queue-pending');

    Ajax.call([{
      methodname: method,
      args: data,
      done: function (result) {
        // competencies list, remove the row
        $row.fadeOut(500, function () {
          $(this).remove(); // Remove the <tr> from the DOM after fading out
        });
      },
      fail: function (ex) {
        $row.addClass('displace-alert danger');
        Notification.exception(ex);
      }
    }]);
  }
}
