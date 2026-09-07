/**
 * Manager Time Off — Google Calendar bridge
 *
 * Script Property required:
 *   BRIDGE_SECRET = same value as Cloudflare APPS_SCRIPT_BRIDGE_SECRET
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected = PropertiesService.getScriptProperties().getProperty('BRIDGE_SECRET');

    if (!expected || body.secret !== expected) {
      return output({ ok: false, error: 'Unauthorised' });
    }

    var calendarName = String(body.calendar_name || 'Manager Holiday Calendar');
    var calendars = CalendarApp.getCalendarsByName(calendarName);
    if (!calendars.length) {
      return output({ ok: false, error: 'Calendar not found: ' + calendarName });
    }
    var calendar = calendars[0];

    if (body.action === 'create_event') {
      var start = parseDate(body.start_date);
      var end = parseDate(body.end_date);
      if (!start || !end || end < start) {
        return output({ ok: false, error: 'Invalid dates' });
      }

      var endExclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      var requestType = String(body.request_type || '').toUpperCase();
      var manager = String(body.manager || '').trim();
      var title = requestType === 'DAY OFF'
        ? 'OFF R - ' + manager
        : 'Holiday - ' + manager;

      var event = calendar.createAllDayEvent(
        title,
        start,
        endExclusive,
        { description: String(body.notes || '') }
      );

      return output({ ok: true, event_id: event.getId() });
    }

    return output({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return output({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function parseDate(value) {
  var m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
