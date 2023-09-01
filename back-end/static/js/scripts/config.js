export class Config {
  static SERVER_URL = `${window.location.protocol}//${window.location.hostname}/`;

  //static BASE_URL = `${this.SERVER_URL}api/v1/`;
  static WIDTH = 1024;
  static HEIGHT = 1024;
  static FRAME_RATE = 14;
  static VIDEO_SECONDS = 3;
  static MATCH_LEVEL = 0.7;
  static DEBUG = true;
  static TIME_LIMIT = "00:30:00";
  static MAX_PICTURES_SOLO = 5;
}
