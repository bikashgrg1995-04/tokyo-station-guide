// Every fixed piece of website text, in English and Japanese.
//
// Text that an admin types (station names, descriptions, notes, ...) does not
// live here: it comes from the database, each with its own *_japanese twin.
// Use {n}-style placeholders for values that are filled in at run time.

export const DICT = {
  en: {
    /* Top bar */
    "top.theme": "Toggle theme",
    "top.search": "Search stations",
    "top.lang": "Language",

    /* Board */
    "board.selectLine": "Select line",
    "board.noLines": "No lines available",
    "board.info": "Info",
    "board.page": "Page",
    "board.prev": "Previous station",
    "board.next": "Next station",

    /* Lines dialog */
    "lines.title": "Train lines",
    "lines.more": "More lines coming soon",
    "lines.soon": "Coming soon",

    /* "Station page" coming-soon dialog */
    "soon.title": "Station page",
    "soon.body": "Coming soon. Dedicated station pages are on the way.",
    "soon.ok": "Got it",

    /* Search */
    "search.title": "Where are you going?",
    "search.placeholder": "Search stations or codes",
    "search.close": "Close search",
    "search.featured": "Popular Station Hubs",
    "search.recent": "Recent",
    "search.empty": "No stations found. Try the English or Japanese name.",

    /* Station sheet */
    "sheet.lang": "Language",
    "sheet.close": "Close",
    "sheet.suggest": "Suggest an Edit",
    "sheet.details": "Station details",
    "sheet.tab.facilities": "At the station",
    "sheet.tab.platforms": "Platforms",
    "sheet.tab.picks": "Top picks",
    "sheet.noFacilities": "No facilities listed yet.",
    "sheet.tapIcon": "Tap an icon for detail.",
    "sheet.scrollMore": "Scroll for more",
    "sheet.nearbyExit": "Nearby Exit",
    "sheet.floor": "Floor {n}",
    "sheet.unit": "{n} unit",
    "sheet.units": "{n} units",
    "sheet.noPlatforms": "No platform information yet.",
    "sheet.platform": "Platform {n}",
    "sheet.noPicks": "No top picks yet.",
    "sheet.inside": "Inside",
    "sheet.outside": "Outside",
    "sheet.insideOutside": "Inside & outside",
    "sheet.walk": "About {n} min walk",
    "sheet.mapLink": "View on Google Maps",
    "sheet.fee": "Entry fee: ",
    "sheet.hours": "Hours: ",
    "sheet.lastEntry": "Last entry: ",
    "sheet.closed": "Closed",
    "sheet.verified": "Verified",
    "sheet.notVerified": "Not yet verified",
    "sheet.note":
      "Icons appear only when the floor is checked. Unverified facts stay hidden.",

    /* Suggestion form */
    "sug.label": "What would you like to suggest?",
    "sug.placeholder":
      "Tell us what is wrong or missing, e.g. the coin lockers moved to the 2nd floor.",
    "sug.cancel": "Cancel",
    "sug.close": "Close",
    "sug.submit": "Submit Suggestion",
    "sug.submitting": "Submitting...",
    "sug.thanks": "Thank you! Your suggestion has been sent for review.",
    "sug.error": "Unable to submit your suggestion. Please try again.",
    "sug.network": "A network error occurred. Please try again.",
  },

  jp: {
    /* Top bar */
    "top.theme": "テーマを切り替え",
    "top.search": "駅を検索",
    "top.lang": "言語",

    /* Board */
    "board.selectLine": "路線を選択",
    "board.noLines": "利用できる路線がありません",
    "board.info": "駅情報",
    "board.page": "ページ",
    "board.prev": "前の駅",
    "board.next": "次の駅",

    /* Lines dialog */
    "lines.title": "路線",
    "lines.more": "ほかの路線も近日公開",
    "lines.soon": "近日公開",

    /* "Station page" coming-soon dialog */
    "soon.title": "駅ページ",
    "soon.body": "近日公開予定です。駅ごとの専用ページを準備中です。",
    "soon.ok": "OK",

    /* Search */
    "search.title": "どこへ行きますか？",
    "search.placeholder": "駅名・駅番号で検索",
    "search.close": "検索を閉じる",
    "search.featured": "人気のターミナル駅",
    "search.recent": "最近見た駅",
    "search.empty":
      "駅が見つかりません。英語または日本語の駅名でお試しください。",

    /* Station sheet */
    "sheet.lang": "言語",
    "sheet.close": "閉じる",
    "sheet.suggest": "修正を提案",
    "sheet.details": "駅の詳細",
    "sheet.tab.facilities": "駅の設備",
    "sheet.tab.platforms": "ホーム",
    "sheet.tab.picks": "おすすめスポット",
    "sheet.noFacilities": "設備情報はまだありません。",
    "sheet.tapIcon": "アイコンをタップすると詳細が表示されます。",
    "sheet.scrollMore": "さらに表示",
    "sheet.nearbyExit": "最寄りの出口",
    "sheet.floor": "{n}",
    "sheet.unit": "{n}か所",
    "sheet.units": "{n}か所",
    "sheet.noPlatforms": "ホーム情報はまだありません。",
    "sheet.platform": "{n}番線",
    "sheet.noPicks": "おすすめスポットはまだありません。",
    "sheet.inside": "駅構内",
    "sheet.outside": "駅の外",
    "sheet.insideOutside": "駅構内・駅外",
    "sheet.walk": "徒歩約{n}分",
    "sheet.mapLink": "Googleマップで見る",
    "sheet.fee": "入場料: ",
    "sheet.hours": "営業時間: ",
    "sheet.lastEntry": "最終入場: ",
    "sheet.closed": "定休日",
    "sheet.verified": "確認済み",
    "sheet.notVerified": "未確認",
    "sheet.note":
      "フロアを確認済みの場合のみアイコンを表示します。未確認の情報は表示されません。",

    /* Suggestion form */
    "sug.label": "どのような内容を提案しますか？",
    "sug.placeholder":
      "誤りや不足している情報をお知らせください。例：コインロッカーが2階に移動しました。",
    "sug.cancel": "キャンセル",
    "sug.close": "閉じる",
    "sug.submit": "提案を送信",
    "sug.submitting": "送信中…",
    "sug.thanks": "ありがとうございます。ご提案を受け付けました。確認後に反映します。",
    "sug.error": "提案を送信できませんでした。もう一度お試しください。",
    "sug.network": "通信エラーが発生しました。もう一度お試しください。",
  },
};
