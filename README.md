# What is Project?

한국 powerball 데이터 크롤링 프로젝트


# how to start?

```shell
yarn start --id=${yourId} --password=${yourPassword}
```

## argv options

|name|type|default|required|description|
|---|---|---|---|-----|
|id|string|none|true|파워볼 아이디|
|password|string|none|true|파워볼 비밀번호|
|start-date|yyyy-MM-dd|2021-01-03|false|시작 날짜|
|end-date|yyyy-MM-dd|now|false|종료 날짜|
|retry|number|10|false|재시작 횟수|
|headless|boolean|false|true|크롤링 브라우저 headless|
|output|string|results.csv|false|크롤링 된 데이터 저장 위치|


# sample results file

|year|month|day|hour|minute|round1|round2|1|2|3|4|5|special|
|--|--|--|--|--|--|--|--|--|--|--|--|--|
|2021|01|03|23|58|1052793|288|09|27|12|24|04|3|
|2021|01|03|23|53|1052792|287|08|20|01|28|02|0|
|2021|01|03|23|48|1052791|286|27|19|06|14|10|1|
|2021|01|03|23|43|1052790|285|01|09|12|19|15|1|