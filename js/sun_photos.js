// Made by tools/fetch_sun.js. Real SDO photos of the Sun on each flare day in the archive.
// radius: where the edge of the Sun is, as a share of the image width.
(function (root) {
  var photos = {
    "2016-01-01": {
      "file": "assets/sun/2016-01-01.jpg",
      "time": "2016-01-01T23:08:00Z",
      "wave": 131
    },
    "2016-01-28": {
      "file": "assets/sun/2016-01-28.jpg",
      "time": "2016-01-28T11:56:00Z",
      "wave": 131
    },
    "2026-08-10": {
      "file": "assets/sun/2026-08-10.jpg",
      "time": "2026-08-10T12:42:00Z",
      "wave": 131
    },
    "2026-08-14": {
      "file": "assets/sun/2026-08-14.jpg",
      "time": "2026-08-14T06:46:00Z",
      "wave": 131
    },
    "2026-08-16": {
      "file": "assets/sun/2026-08-16.jpg",
      "time": "2026-08-16T19:09:00Z",
      "wave": 131
    },
    "2026-08-17": {
      "file": "assets/sun/2026-08-17.jpg",
      "time": "2026-08-17T16:26:00Z",
      "wave": 131
    },
    "2026-08-19": {
      "file": "assets/sun/2026-08-19.jpg",
      "time": "2026-08-19T18:32:00Z",
      "wave": 131
    },
    "2026-08-20": {
      "file": "assets/sun/2026-08-20.jpg",
      "time": "2026-08-20T11:40:00Z",
      "wave": 131
    },
    "2026-08-21": {
      "file": "assets/sun/2026-08-21.jpg",
      "time": "2026-08-21T09:17:00Z",
      "wave": 131
    },
    "2026-08-24": {
      "file": "assets/sun/2026-08-24.jpg",
      "time": "2026-08-24T18:59:00Z",
      "wave": 131
    },
    "2026-08-25": {
      "file": "assets/sun/2026-08-25.jpg",
      "time": "2026-08-25T09:40:00Z",
      "wave": 131
    },
    "2026-08-26": {
      "file": "assets/sun/2026-08-26.jpg",
      "time": "2026-08-26T06:37:00Z",
      "wave": 131
    },
    "2025-01-05": {
      "file": "assets/sun/2025-01-05.jpg",
      "time": "2025-01-05T02:22:00Z",
      "wave": 131
    },
    "2025-01-06": {
      "file": "assets/sun/2025-01-06.jpg",
      "time": "2025-01-06T16:20:00Z",
      "wave": 131
    },
    "2025-01-07": {
      "file": "assets/sun/2025-01-07.jpg",
      "time": "2025-01-07T22:43:00Z",
      "wave": 131
    },
    "2025-01-09": {
      "file": "assets/sun/2025-01-09.jpg",
      "time": "2025-01-09T00:26:00Z",
      "wave": 131
    },
    "2025-01-10": {
      "file": "assets/sun/2025-01-10.jpg",
      "time": "2025-01-10T09:32:00Z",
      "wave": 131
    },
    "2025-01-11": {
      "file": "assets/sun/2025-01-11.jpg",
      "time": "2025-01-11T08:43:00Z",
      "wave": 131
    },
    "2025-01-17": {
      "file": "assets/sun/2025-01-17.jpg",
      "time": "2025-01-17T13:32:00Z",
      "wave": 131
    },
    "2025-01-18": {
      "file": "assets/sun/2025-01-18.jpg",
      "time": "2025-01-18T00:52:00Z",
      "wave": 131
    },
    "2025-01-19": {
      "file": "assets/sun/2025-01-19.jpg",
      "time": "2025-01-19T03:36:00Z",
      "wave": 131
    },
    "2025-01-21": {
      "file": "assets/sun/2025-01-21.jpg",
      "time": "2025-01-21T10:16:00Z",
      "wave": 131
    },
    "2025-01-22": {
      "file": "assets/sun/2025-01-22.jpg",
      "time": "2025-01-22T10:52:00Z",
      "wave": 131
    },
    "2025-01-24": {
      "file": "assets/sun/2025-01-24.jpg",
      "time": "2025-01-24T20:56:00Z",
      "wave": 131
    },
    "2025-01-25": {
      "file": "assets/sun/2025-01-25.jpg",
      "time": "2025-01-25T17:24:00Z",
      "wave": 131
    },
    "2025-01-27": {
      "file": "assets/sun/2025-01-27.jpg",
      "time": "2025-01-27T08:00:00Z",
      "wave": 131
    },
    "2025-01-28": {
      "file": "assets/sun/2025-01-28.jpg",
      "time": "2025-01-28T19:49:00Z",
      "wave": 131
    },
    "2025-01-29": {
      "file": "assets/sun/2025-01-29.jpg",
      "time": "2025-01-29T03:44:00Z",
      "wave": 131
    },
    "2025-01-31": {
      "file": "assets/sun/2025-01-31.jpg",
      "time": "2025-01-31T13:48:00Z",
      "wave": 131
    },
    "2025-02-01": {
      "file": "assets/sun/2025-02-01.jpg",
      "time": "2025-02-01T13:22:00Z",
      "wave": 131
    },
    "2025-02-02": {
      "file": "assets/sun/2025-02-02.jpg",
      "time": "2025-02-02T14:06:00Z",
      "wave": 131
    },
    "2025-02-03": {
      "file": "assets/sun/2025-02-03.jpg",
      "time": "2025-02-03T04:00:00Z",
      "wave": 131
    },
    "2025-02-04": {
      "file": "assets/sun/2025-02-04.jpg",
      "time": "2025-02-04T11:17:00Z",
      "wave": 131
    },
    "2026-02-01": {
      "file": "assets/sun/2026-02-01.jpg",
      "time": "2026-02-01T23:52:00Z",
      "wave": 131
    },
    "2026-02-02": {
      "file": "assets/sun/2026-02-02.jpg",
      "time": "2026-02-02T00:39:00Z",
      "wave": 131
    },
    "2026-02-03": {
      "file": "assets/sun/2026-02-03.jpg",
      "time": "2026-02-03T14:06:00Z",
      "wave": 131
    },
    "2026-02-04": {
      "file": "assets/sun/2026-02-04.jpg",
      "time": "2026-02-04T12:10:00Z",
      "wave": 131
    },
    "2026-02-05": {
      "file": "assets/sun/2026-02-05.jpg",
      "time": "2026-02-05T04:33:00Z",
      "wave": 131
    },
    "2026-02-08": {
      "file": "assets/sun/2026-02-08.jpg",
      "time": "2026-02-08T13:54:00Z",
      "wave": 131
    }
  };
  root.SUN_PHOTOS = { radius: 0.4571, source: 'NASA SDO / AIA 131 Å, via Helioviewer.org', days: photos };
  if (typeof module !== 'undefined') module.exports = root.SUN_PHOTOS;
})(typeof window !== 'undefined' ? window : globalThis);
