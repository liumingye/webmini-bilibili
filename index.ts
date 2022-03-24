import {
  videoUrlPrefix,
  bangumiUrlPrefix,
  liveUrlPrefix,
  getVidWithP,
  getBvid,
  getPartOfBangumi,
  getPartOfVideo,
} from "./utils";
import path from "path";
import pkg from "./package.json";

export const plugin = {
  name: pkg.name,
  urlInclude: [
    "www.bilibili.com",
    "m.bilibili.com",
    "live.bilibili.com",
    "passport.bilibili.com",
    "t.bilibili.com",
    "link.bilibili.com",
  ],
  preloads: [path.resolve(__dirname, "./preload/index.js")],
  load: ({ addHook, addData, application, webContents, net, cookies }) => {
    cookies
      .get({
        url: "https://www.bilibili.com",
        name: "DedeUserID",
      })
      .then((uid) => {
        const replace: { search: string; replace: string }[] = [];
        if (uid.length !== 0) {
          replace.push({
            search: "${uid}",
            replace: uid[0].value,
          });
        }
        addData("webNav", (presetBase) => {
          presetBase.replace = replace;
          presetBase.search = {
            placeholder: "av号/BV号/lv直播/网址/关键词",
            link: "https://m.bilibili.com/search?keyword=%s",
            links: [
              {
                // 包含bilibili.com的字符串和纯数字是合法的跳转目标
                test: /bilibili\.com/,
                link: "%s",
              },
              {
                // 直播
                test: /^lv(\d+)$/,
                link: "https://live.bilibili.com/blanc/%s",
              },
              {
                // 纯数字是av号
                test: /^(\d+)$/,
                link: "https://www.bilibili.com/video/av%s",
              },
              {
                // av号
                test: /^(av\d+)$/,
                link: "https://www.bilibili.com/video/%s",
              },
              {
                // BV号
                test: /^(BV\w+)$/,
                link: "https://www.bilibili.com/video/%s",
              },
            ],
          };
          presetBase.nav = {
            主站: [
              {
                name: "主站(pc)",
                url: "https://www.bilibili.com/",
              },
              {
                name: "主站(m)",
                url: "https://m.bilibili.com/",
              },
              {
                name: "排行榜",
                url: "https://m.bilibili.com/ranking",
              },
              {
                name: "动态",
                url: "https://t.bilibili.com/?tab=8",
              },
              {
                name: "个人空间",
                url: "https://space.bilibili.com/",
              },
              {
                name: "收藏",
                url: "https://space.bilibili.com/${uid}/favlist",
              },
              {
                name: "历史",
                url: "https://www.bilibili.com/account/history",
              },
              {
                name: "稍后再看",
                url: "https://www.bilibili.com/watchlater/#/list",
              },
              {
                name: "创作中心",
                url: "https://member.bilibili.com/platform/home",
              },
            ],
            直播: [
              {
                name: "直播(pc)",
                url: "https://live.bilibili.com/",
              },
              {
                name: "直播(m)",
                url: "https://live.bilibili.com/h5",
              },
              {
                name: "我的关注",
                url: "https://link.bilibili.com/p/center/index#/user-center/follow/1",
              },
              {
                name: "排行榜",
                url: "https://live.bilibili.com/p/eden/rank#/childnav/vitality/0",
              },
              {
                name: "直播中心",
                url: "https://link.bilibili.com/p/center/index#/user-center/my-info/operation",
              },
            ],
            番剧: [
              {
                name: "番剧",
                url: "https://www.bilibili.com/anime",
              },
              {
                name: "我的追番",
                url: "https://space.bilibili.com/${uid}/bangumi",
              },
              {
                name: "新番时间表",
                url: "https://www.bilibili.com/anime/timeline/",
              },
            ],
            其他: [
              {
                name: "专栏",
                url: "https://www.bilibili.com/read/home",
              },
              {
                name: "频道",
                url: "https://www.bilibili.com/v/channel/",
              },
              {
                name: "消息",
                url: "https://message.bilibili.com/#/reply",
              },
            ],
          };
        });
      });

    addData("themeColor", (presetBase) => {
      presetBase.light = {
        bg: "#f36f98",
        text: "#fff",
      };
      presetBase.dark = {
        bg: "#f36f98",
        text: "#fff",
      };
    });

    addData("windowType", (presetBase) => {
      presetBase.mini = [
        /(www|m)\.bilibili\.com\/(video\/(av|BV)|bangumi\/play\/)/,
        /live\.bilibili\.com\/(blanc|h5|)\/\d+/,
      ];
    });

    addData("userAgent", (presetBase) => {
      presetBase.desktop = ["passport.bilibili.com/login"];
      presetBase.mobile = [
        "m.bilibili.com/",
        "live.bilibili.com/h5",
        "live.bilibili.com/pages/h5",
        "www.bilibili.com/read/mobile",
        "www.bilibili.com/read/cv",
        "h.bilibili.com/ywh/h5",
        "t.bilibili.com/",
      ];
    });

    const last = {
      vid: "",
    };

    addHook("updateUrl", {
      after: ({ url }: { url: URL }) => {
        application.mainWindow?.send(
          "setAppState",
          "disableDanmakuButton",
          true
        );
        application.mainWindow?.send("setAppState", "autoHideBar", false);

        if (["www.bilibili.com", "m.bilibili.com"].includes(url.hostname)) {
          // 视频
          const vid = getVidWithP(url.pathname);
          if (vid) {
            if (url.hostname === "m.bilibili.com") {
              webContents.once("did-stop-loading", () => {
                webContents.loadURL(videoUrlPrefix + vid);
              });
              if (url.pathname.startsWith("/video/")) {
                webContents.goBack();
              }
            } else if (url.hostname === "www.bilibili.com") {
              if (vid !== last.vid) {
                getPartOfVideo(application, net, vid);
                last.vid = vid;
                application.mainWindow?.send(
                  "setAppState",
                  "disableDanmakuButton",
                  false
                );
                application.mainWindow?.send(
                  "setAppState",
                  "autoHideBar",
                  true
                );
                const m = /p=(\d+)/.exec(url.pathname);
                const currentPartId = m ? Number(m[1]) - 1 : 0;
                application.selectPartWindow?.send(
                  "update-currentPartId",
                  currentPartId
                );
              }
            }
            return;
          }

          // 番剧
          const bvid = getBvid(url.pathname);
          if (bvid) {
            if (url.hostname === "m.bilibili.com") {
              webContents.once("did-stop-loading", () => {
                webContents.loadURL(bangumiUrlPrefix + bvid);
              });
              if (url.pathname.startsWith("/bangumi/")) {
                webContents.goBack();
              }
            } else if (url.hostname === "www.bilibili.com") {
              getPartOfBangumi(application, net, bvid);
              application.mainWindow?.send(
                "setAppState",
                "disableDanmakuButton",
                false
              );
              application.mainWindow?.send("setAppState", "autoHideBar", true);
            }
            return;
          }
        }

        // 直播
        if (url.hostname === "live.bilibili.com") {
          const live = /^\/(h5\/||blanc\/)?(\d+).*/.exec(url.pathname);
          if (live) {
            if (live[1] === "h5/") {
              webContents.once("did-stop-loading", () => {
                webContents.loadURL(liveUrlPrefix + live[2]);
              });
              if (url.pathname.startsWith("/h5/")) {
                webContents.goBack();
              }
            } else {
              application.mainWindow?.send(
                "setAppState",
                "disableDanmakuButton",
                false
              );
              application.mainWindow?.send("setAppState", "autoHideBar", true);
            }
            return;
          }
        }

        application.mainWindow?.send("setAppState", "disablePartButton", true);
        application.selectPartWindow?.send("update-part", null);
      },
    });
  },
  unload: () => {
    //
  },
};
