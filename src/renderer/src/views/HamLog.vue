<template>
  <div class="logapp">
    <!--添加QSO-->
    <div class="addQSO logbox"></div>
    <!--QSO列表-->
    <div class="qsoList logbox">
      <table>
        <thead>
          <tr>
            <th>日期时间</th>
            <th>对方呼号</th>
            <th>通联频率</th>
            <th>发射模式</th>
            <th>发送信号报告</th>
            <th>接收信号报告</th>
            <th>功率</th>
            <th>使用设备</th>
            <th>对方位置</th>
            <th>天线信息</th>
            <th>备注信息</th>
            <th>QSL状态</th>
            <th>天气信息</th>
            <th>天线类型</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(log, index) in logs" :key="log.id">
            <td>{{ log.datetime }}</td>
            <td>{{ log.call }}</td>
            <td>{{ log.freq }}</td>
            <td>{{ log.mode }}</td>
            <td>{{ log.rstS }}</td>
            <td>{{ log.rstR }}</td>
            <td>{{ log.power }}</td>
            <td>{{ log.device }}</td>
            <td>{{ log.qth }}</td>
            <td>{{ log.atn }}</td>
            <td>{{ log.message }}</td>
            <td>{{ log.qsl }}</td>
            <td>{{ log.weather }}</td>
            <td>{{ log.antenna }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '../function/useTheme'
import { useLog } from '../function/useLog'

const theme = useTheme()
const { logs } = useLog()
</script>

<style scoped lang="less">
@import '../style/mixins.less';
@import '../style/hamlog.less';
</style>
