//----------------------------------------
// ここにGitHub APIのアクセストークンを記入します
// 例: GITHUB_ACCESS_TOKEN = '123456789abcdef111222333444555666777abcd'

var GITHUB_ACCESS_TOKEN = '';


//----------------------------------------
// GitHub Issue API
var COLUMN_ISSUE_LINK = 1;
var COLUMN_ISSUE_NO = 2;
var COLUMN_MILE_STONE = 3;
var COLUMN_TITLE=4;
var COLUMN_BODY=5;
var COLUMN_ASSIGNEE=6;
var COLUMN_LABELS=7;

// GitHubからIssueを取ってきて全部更新
function refreshSheet() {

  var MAX_PAGE_NUM = 8; //表示するissueのページ数
  
  // APIからissueのjsonを取得
  var getIssueJson = function(owner, repository){    
    //全ページ分fetch 30issue / page
    var j_obj = [];
    for(i = 1; i <= MAX_PAGE_NUM; i++) {
      var url = 'https://api.github.com/repos/' + owner + '/' + repository + '/issues?page=' + i +'&state=open&sort=created&direction=desc&access_token=' + GITHUB_ACCESS_TOKEN;
      try {
        var response = UrlFetchApp.fetch(url);
        
        var json = response.getContentText();
        Array.prototype.push.apply(j_obj,JSON.parse(json));
        if( json.length <= 2 )
          break;
      }
      catch(e) {
        Logger.log("issue fetch error: <" + repository + ">\n" + e);
        return null;
      }
    }
    return j_obj;
  }
  
  // issueのjsonから中身を取得
  var getAttributesOfIssue = function(issue) {
    var milestone = "";
    if(issue["milestone"]){
      milestone = issue["milestone"]["title"];
    }
    
    var labels = "";
    if(issue["labels"]){
      labels = issue["labels"].map(function(label){
        return label["name"]
      }).join(",");
    }
    
    var assignee = "";
    if(issue["assignee"]){
      assignee = issue["assignee"]["login"];
    }
    
    var url = '=HYPERLINK("' + issue["html_url"] + '","URL")';
    
    return [
      url,
      issue["number"],
      milestone,
      issue["title"],
      issue["body"].length < 50000 ? issue["body"] : "",
      assignee,
      labels]
  }
  
  // １つのシートを更新
  var refreshIssuesSheet = function(sheet) {
    if(sheet == null) return null;
    
    //　シート名が、オーナー名 / レポジトリ名
    var names = sheet.getName().split('/');
    var issue_json = getIssueJson(names[0],names[1]);
    if(issue_json == null){ return null; }
    
    var issues = issue_json.map(function(issue){
      return getAttributesOfIssue(issue);
    });
    
    sheet.clearContents();
    var titles = ["Link", "No", "Milestone", "Title", "Body", "Assignee", "Labels"];
    issues.unshift(titles);
    sheet.getRange("A1:G" + (issues.length).toString()).setValues(issues);
  }
  
  
  if( "ok" == Browser.msgBox("GitHubからデータを再読み込みします。GitHubへ未保存のデータは消えますがよろしいですか？", Browser.Buttons.OK_CANCEL))　{    
    refreshIssuesSheet(SpreadsheetApp.getActiveSheet());
  }
  
}


// milestoneの対応付けテーブルを作成
function getMileStoneTable(owner, repository)　{
  //GET /repos/:owner/:repo/milestones
  var milestone_table = [];

  try　{
    var milestone_objs = [];
    var url = 'https://api.github.com/repos/' + owner + '/' + repository + '/milestones?access_token=' + GITHUB_ACCESS_TOKEN;
    
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    
    milestone_objs = JSON.parse(json)
    
    milestone_objs.map(function(milestone){
      milestone_table[milestone["title"]] = milestone["number"]; 
    });
  }
  catch(e)　{
    log("milestone fetch error: <" + repository + ">\n" + e);
  }  
  
  return milestone_table;
}


// 新しくissueを作る
// 作られたissueのjsonオブジェクトをそのまま返します。
// milestoneは"number"のintegerです
function createIssue(owner, repository, title, body, milestone, labels, assignee){
  //POST /repos/:owner/:repo/issues
  var url = 'https://api.github.com/repos/' + owner + '/' + repository + '/issues?access_token=' + GITHUB_ACCESS_TOKEN;
  
  var payload =
      {
        "title": title,
        "body": body,
    };
  
  if(assignee.length > 0) {
    payload["assignee"] = assignee;
  }
  
  if(labels.length > 0 && labels[0].length > 0) {
    payload["labels"] = labels;
  }
  
  if(milestone > 0 )
  {
    payload["milestone"] = milestone;
  }
  
  return sendHttpPost( url, JSON.stringify(payload));
}

// issue edit系のURLを作る
function createEditUrl(owner, repository, number) {
  return 'https://api.github.com/repos/' + owner + '/' + repository + '/issues/' + number +'?access_token=' + GITHUB_ACCESS_TOKEN;
}

// issueのtitleを更新
function editTitle(owner, repository, no, title) {
  var payload =
      {
        "title" : title
      };
  
  return sendHttpPatch(createEditUrl(owner, repository, no ), JSON.stringify(payload));
}


// issueのbodyを更新
function editBody(owner, repository, no,body){
  var payload =
      {
        "body" : body
      };
  
  return sendHttpPatch(createEditUrl(owner, repository, no ), JSON.stringify(payload));
}

// issueのassigneeを更新
function editAssignee(owner, repository, no,assignee){
  var payload =
      {
        "assignee" : assignee
      };
  
  return sendHttpPatch(createEditUrl(owner, repository, no ), JSON.stringify(payload));
}

// issueのlabelを更新
function editLabels(owner, repository, no,labels){
  var payload =
      {
        "labels" : labels
      };
    
  return sendHttpPatch(createEditUrl(owner, repository, no ), JSON.stringify(payload));
}

// issueのmilestoneを更新
// milestoneはtitleの文字列
function editMileStone(owner, repository, no, milestone) {
  var milestone_table = getMileStoneTable(owner, repository);
  
  if(milestone_table[milestone] == undefined) {
    log("エラー：該当するマイルストーンがありません。予めGitHubでマイルストーン " + milestone + "を作成してください。(" + owner + "/" + repository + " issue:" + no + ")");
    return;
  }
  
  var payload =
      {
        "milestone" : milestone_table[milestone]
      };
      
  return sendHttpPatch(createEditUrl(owner, repository, no ), JSON.stringify(payload));
}


//----------------------------------------
// HTTP Post/Patch request
function sendHttpPost(url, payload){

   var options =
   {
     "method" : "post",
     "payload" : payload
   };

   return UrlFetchApp.fetch(url, options);
}

function sendHttpPatch(url, payload){

   var options =
   {
     "method" : "patch",
     "payload" : payload
   };

   return UrlFetchApp.fetch(url, options);
}

function log(message) {
  var SHEET_NAME = "log";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if( sheet == null ){
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.insertSheet(SHEET_NAME,ss.getSheets().length);
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  var now = new Date();
  var m = [now,message];
  sheet.appendRow(m);
}


//----------------------------------------
// スプレッドシートのイベントハンドラ
// ライブラリではイベントの着火はされないぽいので、読み込み先で読み込む必要あり。
// onOpen
function onOpen() {
  log("onOpen");
  var menuEntries = [ {name: "? GitHubから再読み込み", functionName: "refreshSheet"}, {name: "? GitHubへ新しいIssueを保存", functionName: "saveNewIssuesToGitHub"} ];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.addMenu("??GitHub", menuEntries);
}

function initToken(token) {
  GITHUB_ACCESS_TOKEN = token;
}

// onChanged
function onChanged(e) {
  //Browser.msgBox("onChanged", Browser.Buttons.OK_CANCEL)
  if( SpreadsheetApp.getActiveSheet().getName() == "log") return;
  
  try
  {
    var r = e.source.getActiveRange();
    var sheet = r.getSheet();
    
    //log(e.changeType + ": " + r.getColumn() + " ," + r.getRow()+ " - " + r.getLastColumn() + " ," + r.getLastRow());
    
    if(e.changeType == "EDIT"){
      var repository = getActiveRepository();

      for(var column=r.getColumn(); column<=r.getLastColumn(); column++){
        for(var row=r.getRow(); row<=r.getLastRow(); row++){

          var issue_no = getIssueNo(sheet, row);
          
          // IDがついているか調べる
          // IDがあったらそのissueを更新。なかったら何もしない。
          if( issue_no > 0 )
          {
            log("edit issue : " + issue_no + " (" + column + ", " + row + ")");
            switch(column)
            {
              case  COLUMN_ISSUE_LINK:
                break;
              case  COLUMN_ISSUE_NO:
                break;
              case  COLUMN_MILE_STONE:
                editMileStone(repository["owner"], repository["repository"], issue_no, sheet.getRange(row, column).getValue());
                break;
              case  COLUMN_TITLE:
                editTitle(repository["owner"], repository["repository"], issue_no, sheet.getRange(row, column).getValue());
                break;
              case  COLUMN_BODY:
                editBody(repository["owner"], repository["repository"], issue_no, sheet.getRange(row, column).getValue());
                break;
              case  COLUMN_ASSIGNEE:
                editAssignee(repository["owner"], repository["repository"], issue_no, sheet.getRange(row, column).getValue());
                break;
              case  COLUMN_LABELS:
                editLabels(repository["owner"], repository["repository"], issue_no, sheet.getRange(row, column).getValue().split(','));
                break;
            }
          }   
        }
      }
    }
  }
  catch(e){
    var error = e;
    log("message:" + error.message + "\nfileName:" + error.fileName + "\nlineNumber:" + error.lineNumber + "\nstack:" + error.stack);
  }

}

// 新しいIssueをGitHubに保存
function saveNewIssuesToGitHub() {
  
  try{
    var sheet = SpreadsheetApp.getActiveSheet();
    var repo_name = getActiveRepository();
    var milestone_table = getMileStoneTable(repo_name["owner"], repo_name["repository"]);
    
    // 下からID列が空の行でタイトルの入っている行を探す
    // getLastRow()はデータの入ってる最後の行を返す
    for(var row=sheet.getLastRow(); row>1; row--) {
      var issue_no = getIssueNo(sheet, row);
      if(!(issue_no > 0) && sheet.getRange(row, COLUMN_TITLE).getValue().length > 0 ) {
        
        var milestone_number = milestone_table[sheet.getRange(row, COLUMN_MILE_STONE).getValue()];
        if(milestone_number == undefined ) {
          log("エラー：該当するマイルストーンがありません。予めGitHubでマイルストーン " + sheet.getRange(row, COLUMN_MILE_STONE).getValue() + "を作成してください。(" + repo_name["owner"] + "/" + repo_name["repository"] + " row:(" + row + ")");
          sheet.getRange(row, COLUMN_MILE_STONE).setValue("");
        }
        // issueを登録
        var response = createIssue(repo_name["owner"], repo_name["repository"], 
                    sheet.getRange(row, COLUMN_TITLE).getValue(),
                    sheet.getRange(row, COLUMN_BODY).getValue(),
                    milestone_number,
                    sheet.getRange(row, COLUMN_LABELS).getValue().split(','),
                    sheet.getRange(row, COLUMN_ASSIGNEE).getValue());
        
        // リストのIDとURLを更新
        var j_obj = JSON.parse(response.getContentText());
        //log(JSON.stringify(j_obj, null, "  "));
        
        // ID
        var issue_no = j_obj["number"];
        var issue_url = j_obj["html_url"];
        log( "create issue number=#" + issue_no + "  url= " + issue_url);
        
        var vals = [['=HYPERLINK("' + issue_url + '","URL")', issue_no]];
        sheet.getRange(row, COLUMN_ISSUE_LINK, 1, 2).setValues(vals);
      }
    }
  } 
  catch(e){
    var error = e;
    log("message:" + error.message + "\nfileName:" + error.fileName + "\nlineNumber:" + error.lineNumber + "\nstack:" + error.stack);
  }
}


//----------------------------------------
// util
function getActiveRepository()
{    
  var names = SpreadsheetApp.getActiveSheet().getName().split('/');
  var ownerrep=
      {
        "owner": names[0],
        "repository" : names[1]
      }
  return ownerrep;
}

function getIssueNo(sheet,row){
  return sheet.getRange(row, COLUMN_ISSUE_NO).getValue();
}


