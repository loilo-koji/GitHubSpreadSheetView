# GitHubSpreadSheetView (GSSV)
SpreadSheet View of GitHub Issues.

Google Spread Sheet上で、GitHubのIssueを追加＆編集するためのGoogle Apps Scriptです。
Issueをたくさん登録したい時に便利に使えます。

# インストール方法
1. ツール → スクリプトエディタでスクリプトエディタを起動します。

2. gssv.gsの内容をコピー＆ペースとなどしてスクリプトに追加します。

3. gssv.gsスクリプト冒頭にご自身のアカウントのGitHub APIのアクセストークンを追加してください。
   var GITHUB_ACCESS_TOKEN = 'aaaabbbbccccddd'

4. スプレッドシートをリロードします。
5. メニューに「GitHub」が追加されたことを確認します。


# 使い方
1. スプレッドシートのシート名を使って、レポジトリを指定します。
2. オーナー名とレポジトリ名を/で結合してシート名に入力してください。
  シート名:  オーナー名/レポジトリ名

3. GitHubメニュー→「GitHubから再読み込み」　を実行して、登録済みのIssueを取得します。

## Issueの新規追加
1. 空の行を挿入します。内容を記入します。
2. GitHubメニュー→「GitHubへ新しいIssueを保存」
3. 保存が終わるとIssue番号とURLが追加されます。

## Issueの編集
Issue番号の付いている行のTitleやBodyなどの内容を変更すると自動的にGitHubへと反映されます。

