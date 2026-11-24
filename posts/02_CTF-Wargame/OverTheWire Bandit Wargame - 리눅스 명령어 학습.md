# OverTheWire Bandit Wargame - 리눅스 명령어 학습

CyKor 교육생, SSH 로드맵 중 Secrutiy basics 활동을 진행하며, 보안 공부의 가장 밑바탕이 될 리눅스 명령어들을 OverTheWire의 Bandit 워게임을 완주하며 학습했다.

### Level 0

SSH를 사용해 게임에 로그인하는 것이 목표이다. 연결할 호스트는 포트 2220의 bandit.labs.overthewire.org이며, username과 password는 bandit0이다. 리눅스의 `ssh` 명령어에서 `-p` 옵션을 사용하면 포트를 지정할 수 있고, username과 호스트는 `@`로 이어붙인다.
`ssh -p 2220 bandit0@bandit.labs.overthewire.org`을 입력한 후 password를 입력해 로그인한다.
(`ssh bandit0@bandit.labs.overthewire.org -p 2220`도 가능하다.)

### Level 0 → Level 1

bandit1의 password는 ‘readme’ 파일에 저장되어 있다. `cat` 명령어를 사용하면 파일의 내용을 출력해 볼 수 있다. Level 0과 같이 bandit0으로 로그인한 후, 홈 디렉토리에 위치한 ‘readme’ 파일의 내용을 확인한다.
`cat readme`를 입력해 readme에 적힌 bandit1의 password를 확인하고, `ssh -p 2220 bandit1@bandit.labs.overthewire.org`로 bandit1에 로그인한다.

### Level 1 → Level 2

bandit2의 password는 홈 디렉토리의 ‘-’라는 이름의 파일에 저장되어 있다. 그냥 `cat -`를 입력하면 `-`가 파일 이름이 아니라 표준 입력을 뜻하는 옵션으로 해석되어 입력을 기다리게 된다. 이때 파일 이름 앞에 현재 디렉토리를 뜻하는 `./`를 붙이면 옵션이 아닌 파일 경로로 인식된다.
`cat ./-`를 입력해 파일의 내용을 확인한다.

### Level 2 → Level 3

bandit3의 password는 홈 디렉토리의 ‘spaces in this filename’이라는 파일에 저장되어 있다. 파일 이름에 공백이 있으면 셸이 공백을 기준으로 단어를 나누어 서로 다른 인자로 해석한다. 따라서 `' '`(따옴표)로 파일 이름 전체를 감싸 하나의 인자로 전달해야 한다. (공백 앞에 `\`를 붙이는 방법도 있다.)
`cat 'spaces in this filename'`을 입력해 파일의 내용을 확인한다.

### Level 3 → Level 4

bandit4의 password는 ‘inhere’ 디렉토리 안의 숨김 파일에 저장되어 있다. 리눅스에서 이름이 `.`으로 시작하는 파일은 숨김 파일이며, `ls`로는 보이지 않는다. `cd`는 디렉토리를 이동하는 명령어이고, `ls`에 `-a` 옵션을 사용하면 숨김 파일까지 모두 표시된다.
`cd inhere`로 이동한 후 `ls -a`로 숨김 파일의 이름을 확인하고, `cat ./...Hiding-From-You`로 내용을 확인한다. 파일 이름이 `.`으로 시작하므로 `./`를 붙여 입력했다.

### Level 4 → Level 5

bandit5의 password는 ‘inhere’ 디렉토리의 여러 파일(-file00 ~ -file09) 중 사람이 읽을 수 있는 유일한 파일에 저장되어 있다. 파일 이름이 `-`로 시작하므로 Level 1과 같이 `./`를 붙여야 한다. `file` 명령어는 파일의 종류(ASCII text, data 등)를 알려준다.
`cd inhere` 후 `ls`로 파일 목록을 확인하고, `file ./-file*`로 파일들의 종류를 확인하면 하나만 ASCII text이다. 나머지는 읽을 수 없는 data이다. 해당 파일을 `cat ./-file0X`로 열어 password를 확인한다. (모든 파일을 `cat ./-file00 ./-file01 ... ./-file09`로 한 번에 출력해 읽을 수 있는 문자열을 찾는 방법도 가능하다.)

### Level 5 → Level 6

bandit6의 password는 ‘inhere’ 디렉토리 아래 어딘가에 있는 파일에 저장되어 있으며, 사람이 읽을 수 있고 크기가 1033바이트이며 실행 가능하지 않다는 조건이 주어진다. `find`는 조건에 맞는 파일을 검색하는 명령어이다. `-size 1033c`는 크기가 1033바이트(`c`는 바이트 단위)인 파일, `-type f`는 일반 파일, `! -executable`은 실행 권한이 없는 파일을 뜻한다.
`cd inhere` 후 `find . -type f -size 1033c ! -executable`을 입력하면 조건에 맞는 파일 하나만 나온다(`./maybehere07/.file2`). 이 파일을 `cat ./maybehere07/.file2`로 확인한다.

### Level 6 → Level 7

bandit7의 password는 서버 어딘가에 저장되어 있으며, 소유자가 bandit7, 소유 그룹이 bandit6, 크기가 33바이트인 파일이다. 전체 서버를 검색하려면 `find`의 시작 위치를 루트 디렉토리 `/`로 지정한다. `-user`, `-group`은 각각 파일의 소유자와 소유 그룹을 지정하는 옵션이다. 전체를 검색하면 접근 권한이 없는 디렉토리에서 오류 메시지가 많이 출력되는데, `2>/dev/null`을 붙이면 오류 출력(2번 스트림)을 버려 결과만 깔끔하게 볼 수 있다.
`find / -user bandit7 -group bandit6 -size 33c 2>/dev/null`을 입력하면 `/var/lib/dpkg/info/bandit7.password` 파일이 나오고, `cat /var/lib/dpkg/info/bandit7.password`로 내용을 확인한다.

### Level 7 → Level 8

bandit8의 password는 ‘data.txt’ 파일에서 ‘millionth’라는 단어 옆에 적혀 있다. 파일이 매우 커서 직접 찾기 어려우므로 `grep`을 사용한다. `grep`은 파일에서 특정 문자열이 포함된 줄만 찾아서 출력하는 명령어이다.
`grep 'millionth' data.txt`를 입력해 해당 줄을 찾고, 단어 옆의 password를 확인한다.

### Level 8 → Level 9

bandit9의 password는 ‘data.txt’ 파일에서 딱 한 번만 등장하는 줄이다. `uniq`는 연속해서 중복된 줄만 처리하기 때문에 먼저 `sort`로 같은 줄끼리 붙도록 정렬해야 한다. `sort`는 줄을 정렬하는 명령어이고, `uniq -u`는 중복 없이 한 번만 나타나는 줄만 출력한다. `|`(파이프)는 앞 명령어의 출력을 뒤 명령어의 입력으로 전달한다.
`sort data.txt | uniq -u`를 입력해 password를 확인한다.

### Level 9 → Level 10

bandit10의 password는 ‘data.txt’ 파일 속 사람이 읽을 수 있는 문자열 중 여러 개의 `=` 문자 뒤에 있다. 파일이 대부분 읽을 수 없는 바이너리 데이터라 `cat`으로는 확인하기 어렵다. `strings`는 파일에서 사람이 읽을 수 있는 문자열만 추출해 출력하는 명령어이다.
`strings data.txt | grep '=='`를 입력해 `=`로 시작하는 줄을 찾고, 그 뒤의 password를 확인한다. (`strings data.txt`만 입력해 전체 출력에서 직접 찾아도 된다.)

### Level 10 → Level 11

bandit11의 password는 ‘data.txt’ 파일에 Base64로 인코딩되어 저장되어 있다. Base64는 바이너리 데이터를 문자로 표현하는 인코딩 방식이다. `base64` 명령어에 `-d` 옵션을 사용하면 디코드할 수 있다.
`base64 -d data.txt`를 입력해 디코드된 password를 확인한다.

### Level 11 → Level 12

bandit12의 password는 ‘data.txt’ 파일에 저장되어 있는데, 모든 알파벳이 13칸씩 회전되어(ROT13) 있다. `tr`은 문자를 다른 문자로 치환하는 명령어이다. `tr 'A-Za-z' 'N-ZA-Mn-za-m'`은 대문자 A-Z를 N-Z, A-M으로, 소문자 a-z를 n-z, a-m으로 치환한다는 의미이다. `<`는 파일의 내용을 명령어의 입력으로 전달하는 리다이렉션이다.
`tr 'A-Za-z' 'N-ZA-Mn-za-m' < data.txt`를 입력해 원래의 문장을 복원하고 password를 확인한다.

### Level 12 → Level 13

bandit13의 password는 ‘data.txt’ 파일에 저장되어 있다. 이 파일은 여러 번 압축된 파일을 hexdump(16진수 덤프) 형태로 바꾼 것이다. 따라서 hexdump를 원래의 바이너리로 되돌린 후, 압축을 계속 풀어야 한다. 쓰기 권한이 있는 곳에서 작업하기 위해 `mktemp -d`로 `/tmp` 아래에 임시 디렉토리를 만든다. `xxd -r`은 hexdump를 바이너리로 되돌리는 명령어이다. `mv`는 파일 이름을 변경하거나 이동하며, 압축 해제 명령어(`gunzip`, `bunzip2`)는 확장자가 맞아야 작동하므로 `file`로 압축 형식을 확인한 후 이름을 바꿔주어야 한다. `gunzip`은 gzip, `bunzip2`는 bzip2, `tar xvf`는 tar 파일의 압축을 푼다.

```bash
mktemp -d
cp data.txt /tmp/tmp.OmXzKLOt2X/
cd /tmp/tmp.OmXzKLOt2X
xxd -r data.txt > data
file data
mv data data.gz
gunzip data.gz
file data
bunzip2 data
file data.out
mv data.out data.gz
gunzip data.gz
file data
tar xvf data
tar xvf data5.bin
tar xvf data6.bin
tar xvf data8.bin
mv data8.bin data8.gz
gunzip data8.gz
file data8
cat data8
```

`file`로 확인한 형식에 맞는 명령어로 압축을 해제하는 과정을 반복하여, `file`이 ASCII text라고 알려줄 때 `cat`으로 내용을 확인한다. 압축을 풀 때마다 나오는 파일 이름은 환경에 따라 다르므로 `file`과 `ls`로 매번 확인한다.

### Level 13 → Level 14

bandit14의 password는 직접 주어지지 않고, bandit13의 홈 디렉토리에 bandit14로 로그인할 수 있는 private key(`sshkey.private`)가 있다. SSH는 password 대신 private key로도 인증할 수 있다. `scp`는 SSH를 이용해 파일을 안전하게 복사하는 명령어이고, 포트는 `-P`(대문자)로 지정한다. `chmod 600`은 파일의 소유자만 읽고 쓸 수 있도록 권한을 제한하며, SSH는 권한이 너무 열려 있는 private key는 거부하므로 필수이다. `ssh -i`는 로그인에 사용할 private key 파일을 지정한다.
먼저 `cat sshkey.private`로 key를 확인한 후, **로컬 터미널**에서 key를 내려받는다.

```bash
scp -P 2220 bandit13@bandit.labs.overthewire.org:/home/bandit13/sshkey.private ~/.ssh/sshkey.private
chmod 600 ~/.ssh/sshkey.private
ssh -i ~/.ssh/sshkey.private -p 2220 bandit14@bandit.labs.overthewire.org
```

bandit14로 로그인한 후, 각 레벨의 password는 `/etc/bandit_pass/` 디렉토리에 저장되어 있고 해당 유저만 읽을 수 있으므로 `cat /etc/bandit_pass/bandit14`로 bandit14의 password를 확인한다.

### Level 14 → Level 15

bandit15의 password는 현재 레벨(bandit14)의 password를 localhost의 30000번 포트에 제출하면 받을 수 있다. `nc`(netcat)는 네트워크 연결을 만들어 데이터를 주고받는 명령어이다.
`nc localhost 30000`으로 연결한 후, bandit14의 password를 입력하면 다음 레벨의 password가 출력된다.

### Level 15 → Level 16

bandit16의 password는 현재 레벨의 password를 localhost의 30001번 포트에 SSL/TLS 암호화를 사용해 제출하면 받을 수 있다. 이 포트는 `nc`로 평문 연결을 하면 작동하지 않는다. `openssl s_client`는 SSL/TLS 연결을 만들어주는 명령어이다.
`openssl s_client -connect localhost:30001`로 연결한 후, bandit15의 password를 입력해 다음 레벨의 password를 확인한다.

### Level 16 → Level 17

bandit17의 password를 얻기 위해서는 localhost의 31000~32000번 포트 중 SSL을 사용하는 서버를 찾아 현재 레벨의 password를 제출해야 한다. 이 범위 중 대부분은 입력을 그대로 돌려주기만 하고, 올바른 서버 하나만 다음 레벨의 credentials를 준다. `nmap`은 열려 있는 포트를 스캔하는 명령어이며, `-p`로 스캔할 포트 범위를 지정한다. (`-sV` 옵션을 추가하면 각 포트의 서비스 종류도 확인할 수 있다.)
`nmap -p 31000-32000 localhost`로 열려 있는 포트들을 확인하고, 각 포트에 `openssl s_client`로 연결해 본다. 올바른 서버(31790번 포트)에 연결한 후 bandit16의 password를 입력하면 다음 레벨의 password가 아니라 RSA private key가 출력된다. `-ign_eof` 옵션은 입력이 끝나도 연결을 종료하지 않게 해준다.
`openssl s_client -connect localhost:31790 -ign_eof`
출력된 key를 `vi ~/.ssh/key16.txt`로 붙여넣어 저장하고(`-----BEGIN RSA PRIVATE KEY-----`부터 `-----END RSA PRIVATE KEY-----`까지), Level 13 → 14와 같이 권한을 줄인 후 key로 로그인한다.

```bash
chmod 600 ~/.ssh/key16.txt
ssh -i ~/.ssh/key16.txt -p 2220 bandit17@bandit.labs.overthewire.org
cat /etc/bandit_pass/bandit17
```

### Level 17 → Level 18

홈 디렉토리에 `passwords.old`와 `passwords.new` 두 파일이 있고, bandit18의 password는 두 파일 사이에서 유일하게 바뀐 줄이다. `diff`는 두 파일의 차이점을 보여주는 명령어이고, `-c` 옵션은 변경된 줄 앞에 `!` 표시를 해서 보기 쉽게 보여준다.
`diff -c passwords.new passwords.old`를 입력해 달라진 줄 중, 새로 바뀐 파일(`passwords.new`) 쪽의 줄이 password이다.

### Level 18 → Level 19

bandit19의 password는 홈 디렉토리의 ‘readme’ 파일에 있다. 하지만 누군가 `.bashrc`를 수정해 두어서, bandit18로 로그인하면 바로 로그아웃된다. 이때 `ssh` 뒤에 명령어를 붙이면 로그인과 동시에 해당 명령어만 실행하고 종료하므로 `.bashrc`가 로그아웃시키기 전에 파일을 읽을 수 있다.
`ssh -p 2220 bandit18@bandit.labs.overthewire.org 'cat readme'`를 입력해 password를 확인한다.

### Level 19 → Level 20

홈 디렉토리에 있는 setuid 바이너리 `bandit20-do`를 이용해 bandit20의 password를 읽어야 한다. setuid 파일은 파일을 실행한 사람이 아니라 파일의 소유자 권한으로 실행되는 파일이다. `ls -l`에서 권한 부분에 `s`가 표시된다. 이 파일은 뒤에 붙는 명령어를 bandit20의 권한으로 실행해 준다.
`./bandit20-do cat /etc/bandit_pass/bandit20`을 입력해 password를 확인한다.

### Level 20 → Level 21

홈 디렉토리의 setuid 바이너리 `suconnect`는 지정한 포트로 localhost에 접속해 한 줄을 읽고, 그것이 bandit20의 password와 같으면 bandit21의 password를 돌려준다. 따라서 먼저 우리가 직접 서버를 열어 bandit20의 password를 보내주도록 해야 한다. `nc -l`은 지정한 포트에서 연결을 기다리는(listen) 서버를 연다.
터미널 두 개를 열어 둘 다 bandit20으로 로그인한 후, 첫 번째 터미널에서 서버를 열고 대기한다.
`nc -l 1234`
두 번째 터미널에서 해당 포트로 `suconnect`를 실행한다.
`./suconnect 1234`
첫 번째 터미널의 `nc`에 bandit20의 password를 입력해 전달하면, 두 번째 터미널에 bandit21의 password가 출력된다.

### Level 21 → Level 22

일정 시간마다 프로그램을 자동 실행하는 `cron`을 이용하는 문제이다. cron 설정 파일은 `/etc/cron.d`에 있다. 이곳의 `cronjob_bandit22`를 확인해 어떤 스크립트가 실행되는지 보고, 그 스크립트의 동작을 확인한다.

```bash
cd /etc/cron.d
cat cronjob_bandit22
cat /usr/bin/cronjob_bandit22.sh
```

스크립트는 bandit22의 password를 `/tmp/t7O6lds9S0RqQh9aMcz6ShpAoZKF7fgv`에 저장하도록 되어 있으므로 `cat /tmp/t7O6lds9S0RqQh9aMcz6ShpAoZKF7fgv`로 password를 확인한다.

### Level 22 → Level 23

이번에도 cron을 이용하는 문제이다. `/etc/cron.d/cronjob_bandit23`과 `/usr/bin/cronjob_bandit23.sh`를 확인한다.

```bash
cd /etc/cron.d
cat cronjob_bandit23
cat /usr/bin/cronjob_bandit23.sh
```

스크립트는 `echo I am user $myname | md5sum | cut -d ' ' -f 1`의 결과를 파일 이름으로 하여 `/tmp`에 bandit23의 password를 저장한다. `$myname`은 스크립트를 실행하는 사용자 이름(`whoami`)이므로, 스크립트가 bandit23 권한으로 실행될 때의 파일 이름을 직접 계산해야 한다. `md5sum`은 입력의 MD5 해시값을 계산하고, `cut -d ' ' -f 1`은 공백(`-d ' '`)을 기준으로 나눈 첫 번째 필드(`-f 1`)만 출력한다.
`echo I am user bandit23 | md5sum | cut -d ' ' -f 1`을 입력하면 `8ca319486bfbbc3663ea0fbe81326349`가 나오고, 해당 이름의 파일을 `cat /tmp/8ca319486bfbbc3663ea0fbe81326349`로 확인한다.

### Level 23 → Level 24

cron이 bandit24 권한으로 `/var/spool/bandit24/foo` 디렉토리의 스크립트를 주기적으로 실행하고 삭제한다. 따라서 이 디렉토리에 bandit24의 password를 읽어 저장하는 스크립트를 넣어두면 된다.

```bash
cat /etc/cron.d/cronjob_bandit24
cat /usr/bin/cronjob_bandit24.sh
```

스크립트를 확인한 후 작업할 임시 디렉토리를 만든다. 이 디렉토리는 bandit24 권한으로 실행되는 스크립트가 결과 파일을 쓸 수 있어야 하므로 `chmod o+w`로 다른 사용자(other)에게 쓰기 권한을 준다. `mkdir`은 디렉토리를 만든다.

```bash
mkdir /tmp/tempdirr
cd /tmp/tempdirr
chmod o+w /tmp/tempdirr
vi script.sh
```

`script.sh`에는 아래 내용을 작성한다.

```bash
#!/bin/bash
cat /etc/bandit_pass/bandit24 > /tmp/tempdirr/keyyy.txt
```

스크립트를 bandit24가 실행할 수 있도록 모든 사용자에게 권한을 주고, cron이 확인하는 디렉토리로 복사한다.

```bash
chmod 777 /tmp/tempdirr/script.sh
cp script.sh /var/spool/bandit24/foo/script.sh
```

cron이 실행될 때까지(최대 1분) 기다린 후 `cat keyyy.txt`로 password를 확인한다.

### Level 24 → Level 25

localhost의 30002번 포트에서 동작하는 데몬은 bandit24의 password와 4자리 숫자 pincode(0000~9999)를 공백으로 이어서 보내면 맞는 경우 다음 password를 준다. pincode를 모르므로 모든 경우를 시도해야 하는데, 손으로 입력하는 것은 불가능하므로 모든 조합을 파일로 만들어 한 번에 전달한다. 먼저 `mktemp -d`로 임시 디렉토리를 만들어 이동한 후 `vi script.sh`로 아래 스크립트를 작성한다. `{0000..9999}`는 0000부터 9999까지 자릿수를 유지하며 반복하는 bash 문법이고, `>>`는 파일 끝에 내용을 덧붙인다.

```bash
#!/bin/bash
for i in {0000..9999}
do
echo "<bandit24 password> $i" >> dict.txt
done
```

```bash
chmod 777 script.sh
./script.sh
nc localhost 30002 < dict.txt
```

`nc`에 파일을 입력으로 전달하면 모든 조합이 순서대로 제출된다. 출력 대부분은 “Wrong!” 메시지이므로, 이와 다른 메시지로 나온 줄에서 bandit25의 password를 확인한다. (`| grep -v Wrong`을 붙이면 틀린 시도를 걸러 볼 수 있다.)

### Level 25 → Level 26

bandit25의 홈 디렉토리에는 bandit26으로 로그인할 수 있는 private key(`bandit26.sshkey`)가 있지만, bandit26은 일반 셸이 아닌 다른 프로그램을 로그인 셸로 사용한다.

```bash
cat bandit26.sshkey
cat /etc/passwd
cat /usr/bin/showtext
```

`/etc/passwd`에서 bandit26의 셸이 `/usr/bin/showtext`임을 확인하고, 이 스크립트가 `more`로 텍스트 파일을 출력한 뒤 바로 종료하도록 되어 있음을 확인한다. `more`는 출력이 터미널 화면보다 길면 페이지 단위로 멈추는 명령어이다. 따라서 터미널 창의 크기를 아주 작게 줄이면 출력이 한 번에 끝나지 않고 `more`가 멈춘 상태가 유지된다.
Level 16과 같이 key를 로컬에 저장하고(`~/.ssh/key26.txt`) 권한을 줄인 후, **터미널 창을 작게 줄인 상태에서** 로그인한다.
`ssh -p 2220 -i ~/.ssh/key26.txt bandit26@bandit.labs.overthewire.orgmore`가 멈춘 상태에서 `v`를 입력하면 `vi` 에디터가 실행된다. `vi`에서 `:e`로 다른 파일을 열 수 있으므로 `:e /etc/bandit_pass/bandit26`을 입력해 password를 확인한다.

### Level 26 → Level 27

bandit27의 password를 얻으려면 bandit26으로 로그인한 상태에서 홈 디렉토리의 setuid 바이너리 `bandit27-do`를 사용해야 한다. 하지만 bandit26의 셸은 `showtext`라서 명령어를 입력할 수 없으므로, 25 → 26과 같이 `vi`를 실행한 후 `vi` 안에서 셸을 설정하고 실행한다. `:set shell=/bin/bash`로 `vi`가 사용할 셸을 bash로 지정하고, `:sh`로 해당 셸을 실행한다.

```bash
(vi) :set shell=/bin/bash
(vi) :sh
./bandit27-do cat /etc/bandit_pass/bandit27
```

셸이 실행되면 `bandit27-do`를 이용해 Level 19 → 20과 같은 방법으로 password를 확인한다.

### Level 27 → Level 28

bandit27-git 유저의 홈 디렉토리에 git 저장소가 있고, 이 저장소를 clone해서 password를 찾아야 한다. `git clone`은 원격 저장소를 로컬로 복사하는 명령어이다. 원격 저장소를 SSH로 접근하므로 포트(2220)를 URL에 포함하고, 인증 시 bandit27의 password를 입력한다. 홈 디렉토리에는 쓰기 권한이 없으므로 `mktemp -d`로 만든 디렉토리에서 작업한다.

```bash
git clone ssh://bandit27-git@localhost:2220/home/bandit27-git/repo
cat repo/README
```

복사한 저장소의 README 파일에서 password를 확인한다. (로컬 컴퓨터에서 하는 경우 `localhost` 대신 `bandit.labs.overthewire.org`를 사용한다.)

### Level 28 → Level 29

bandit28-git 저장소를 clone한다. 이번에는 README.md에 password가 가려져 있다.

```bash
git clone ssh://bandit28-git@bandit.labs.overthewire.org:2220/home/bandit28-git/repo
cat repo/README.md
```

`git log`는 저장소의 커밋 기록을 보여주고, `-p` 옵션을 추가하면 각 커밋에서 바뀐 내용까지 보여준다. 이전 커밋에서 password를 지운 기록이 남아 있을 것이므로, 저장소 디렉토리로 이동해 `git log -p`를 입력해 변경 기록에서 원래 password를 확인한다.

### Level 29 → Level 30

bandit29-git 저장소를 clone한다. README.md에는 password가 가려져 있고, `git log -p`로도 확인되지 않는다.

```bash
git clone ssh://bandit29-git@bandit.labs.overthewire.org:2220/home/bandit29-git/repo
cat repo/README.md
```

`git branch -a`는 로컬과 원격의 모든 브랜치를 보여준다. 다른 브랜치를 확인해 보면 `dev` 브랜치 등이 있고, `git checkout`으로 해당 브랜치로 이동할 수 있다.

```bash
git branch -a
git checkout dev
cat README.md
```

dev 브랜치의 README.md에서는 password가 보인다.

### Level 30 → Level 31

bandit30-git 저장소를 clone한다. README, 커밋 기록, 브랜치 어디에서도 단서를 찾을 수 없다.

```bash
git clone ssh://bandit30-git@bandit.labs.overthewire.org:2220/home/bandit30-git/repo
```

`git tag`는 저장소에 붙은 태그(특정 커밋에 붙인 이름표)의 목록을 보여주고, `git show`는 커밋이나 태그의 내용을 보여준다. `git tag`로 `secret`이라는 태그를 발견하고, `git show secret`으로 내용을 확인하면 password가 나온다.

```bash
git tag
git show secret
```

### Level 31 → Level 32

bandit31-git 저장소를 clone한다. README.md에 따르면 `May I come in?`이라는 내용의 `key.txt` 파일을 master 브랜치에 push해야 한다.

```bash
git clone ssh://bandit31-git@bandit.labs.overthewire.org:2220/home/bandit31-git/repo
cat repo/README.md
```

저장소 디렉토리에서 `vi key.txt`로 파일을 만들고 `May I come in?`을 입력한다. 이 저장소는 `.gitignore`에서 `.txt` 파일을 무시하도록 설정되어 있어 `git add`가 막히므로, `-f`(강제) 옵션으로 추가한다. `git commit -m`은 변경 사항을 메시지와 함께 커밋하고, `git remote`는 연결된 원격 저장소의 이름(origin)을 보여주며, `git push`는 커밋을 원격 저장소로 올린다.

```bash
vi key.txt
git add -f key.txt
git commit -m "a"
git remote
git push origin master
```

push하면 원격 저장소에서 작동하는 검사 스크립트가 파일 내용을 확인하고, 출력 메시지에 password를 알려준다.

### Level 32 → Level 33

bandit32로 로그인하면 일반 셸이 아니라 입력한 모든 명령어를 대문자로 바꾸어 실행하는 “UPPERCASE SHELL”이 나온다. 리눅스 명령어는 대소문자를 구분하므로 `ls`를 입력해도 `LS`로 바뀌어 실행되지 않는다.
`$0`는 현재 실행 중인 셸 프로그램의 이름을 가리키는 변수인데, 대문자로 바꿀 소문자가 없으므로 그대로 전달되어 일반 셸이 실행된다.

```bash
$0
cat /etc/bandit_pass/bandit33
```

일반 셸로 넘어간 후에는 bandit33의 권한으로 password를 읽을 수 있다.