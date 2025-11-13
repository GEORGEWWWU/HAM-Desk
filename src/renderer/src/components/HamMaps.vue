<!--component/HamMaps.vue-->
<template>
  <div class="app">
    <!--地图导航-->
    <header>
      <div class="header">
        <div class="header_left">
          <a href="#timeanddate">晨昏线地图</a>
          <a href="#CQMaps">CQ分区图</a>
          <a href="#ChinaCSMaps">中国业余无线电分区图</a>
          <a href="#ITUMaps">ITU分区图</a>
          <a href="#GRIDMaps">网格分区图</a>
        </div>
        <div class="header_right">
          <button @click="refreshMaps">刷新</button>
        </div>
      </div>
    </header>
    <!--传播地图-->
    <div class="Maps">
      <!--HF波段传播条件-->
      <div class="Maps_container">
        <div class="hfmaps_data">
          <div class="hfdata_title">
            <h1>HF 波段传播条件</h1>
            <p>数据每 5 分钟自动更新，来源：<a href="https://www.hamqsl.com/solar.html" target="_blank">hamqsl</a></p>
          </div>
          <div class="hfdata_line">
            <div class="hfdata" @mouseenter="hoverKey = '80m-40m'" @mouseleave="hoverKey = ''">
              <h1>{{ bandTitle('80m-40m') }}</h1>
              <p>白天</p>
              <span
                :class="{ 'Maps-poor-text-color': d1 === 'Poor','Maps-fair-text-color': d1 === 'Fair', 'Maps-good-text-color': d1 === 'Good', 'Maps-loading-text': !d1 }">{{
                  displayD1 || '加载中...' }}</span>
            </div>
            <div class="hfdata" @mouseenter="hoverKey = '30m-20m'" @mouseleave="hoverKey = ''">
              <h1>{{ bandTitle('30m-20m') }}</h1>
              <p>白天</p>
              <span
                :class="{ 'Maps-poor-text-color': d2 === 'Poor', 'Maps-fair-text-color': d2 === 'Fair', 'Maps-good-text-color': d2 === 'Good', 'Maps-loading-text': !d2 }">{{
                  displayD2 || '加载中...' }}</span>
            </div>
            <div class="hfdata" @mouseenter="hoverKey = '17m-15m'" @mouseleave="hoverKey = ''">
              <h1>{{ bandTitle('17m-15m') }}</h1>
              <p>白天</p>
              <span
                :class="{ 'Maps-poor-text-color': d3 === 'Poor', 'Maps-fair-text-color': d3 === 'Fair', 'Maps-good-text-color': d3 === 'Good', 'Maps-loading-text': !d3 }">{{
                  displayD3 || '加载中...' }}</span>
            </div>
            <div class="hfdata" @mouseenter="hoverKey = '12m-10m'" @mouseleave="hoverKey = ''">
              <h1>{{ bandTitle('12m-10m') }}</h1>
              <p>白天</p>
              <span
                :class="{ 'Maps-poor-text-color': d4 === 'Poor', 'Maps-fair-text-color': d4 === 'Fair', 'Maps-good-text-color': d4 === 'Good', 'Maps-loading-text': !d4 }">{{
                  displayD4 || '加载中...' }}</span>
            </div>
          </div>
          <div class="hfdataline"></div>
          <div class="hfdata_line">
            <div class="hfdata" @mouseenter="hoverKey = '80m-40m'" @mouseleave="hoverKey = ''">
              <h1>{{ bandTitle('80m-40m') }}</h1>
              <p>夜晚</p>
              <span
                :class="{ 'Maps-poor-text-color': n1 === 'Poor', 'Maps-fair-text-color': n1 === 'Fair', 'Maps-good-text-color': n1 === 'Good', 'Maps-loading-text': !n1 }">{{
                  displayN1 || '加载中...' }}</span>
            </div>
            <div class="hfdata" @mouseenter="hoverKey = '30m-20m'" @mouseleave="hoverKey = ''">
              <h1>{{ bandTitle('30m-20m') }}</h1>
              <p>夜晚</p>
              <span
                :class="{ 'Maps-poor-text-color': n2 === 'Poor', 'Maps-fair-text-color': n2 === 'Fair', 'Maps-good-text-color': n2 === 'Good', 'Maps-loading-text': !n2 }">{{
                  displayN2 || '加载中...' }}</span>
            </div>
            <div class="hfdata" @mouseenter="hoverKey = '17m-15m'" @mouseleave="hoverKey = ''">
              <h1>{{ bandTitle('17m-15m') }}</h1>
              <p>夜晚</p>
              <span
                :class="{ 'Maps-poor-text-color': n3 === 'Poor', 'Maps-fair-text-color': n3 === 'Fair', 'Maps-good-text-color': n3 === 'Good', 'Maps-loading-text': !n3 }">{{
                  displayN3 || '加载中...' }}</span>
            </div>
            <div class="hfdata" @mouseenter="hoverKey = '12m-10m'" @mouseleave="hoverKey = ''">
              <h1>{{ bandTitle('12m-10m') }}</h1>
              <p>夜晚</p>
              <span
                :class="{ 'Maps-poor-text-color': n4 === 'Poor', 'Maps-fair-text-color': n4 === 'Fair', 'Maps-good-text-color': n4 === 'Good', 'Maps-loading-text': !n4 }">{{
                  displayN4 || '加载中...' }}</span>
            </div>
          </div>
        </div>
      </div>
      <!--最高可用频率与最低可用频率 / UV段传播-->
      <div class="Maps_container">
        <div class="mufd_fof2">
          <div class="mufd_fof2_title">
            <h1>最高可用频率与最低可用频率 / UV段传播图</h1>
            <p>数据来源：<a href="https://prop.kc2g.com/" target="_blank">https://prop.kc2g.com</a> 和 <a
                href="https://www.dxinfocentre.com/" target="_blank">https://www.dxinfocentre.com</a></p>
          </div>
          <div class="mufd_fof2_container">
            <div class="mufd">
              <button @click="openPreview('mufd')">
                <p>打开 MUF 图</p>
                <img :src="getIconPath('全屏')">
              </button>
              <img src="https://prop.kc2g.com/renders/current/mufd-normal-now.svg" decoding="async" alt="MUF图"></img>
            </div>
            <div class="fof2">
              <button @click="openPreview('fof2')">
                <p>打开 foF2 图</p>
                <img :src="getIconPath('全屏')">
              </button>
              <img src="https://prop.kc2g.com/renders/current/fof2-normal-now.svg" decoding="async" alt="foF2"></img>
            </div>
            <div class="uvmaps">
              <button @click="openPreview('uvmaps')">
                <p>打开 UV 图</p>
                <img :src="getIconPath('全屏')">
              </button>
              <img src="https://www.dxinfocentre.com/tr_map/fcst/eas006.png" decoding="async" alt="uvmaps"></img>
            </div>
          </div>
        </div>
      </div>
      <!--晨昏线地图-->
      <div class="Maps_container" id="timeanddate">
        <div class="timeanddate">
          <div class="timedate_title">
            <h1>晨昏线地图</h1>
            <p>数据来源：<a href="https://www.timeanddate.com/" target="_blank">https://www.timeanddate.com/</a></p>
          </div>
          <div class="timedate_img">
            <img src="https://www.timeanddate.com/scripts/sunmap.php" decoding="async" alt="晨昏线地图"></img>
          </div>
        </div>
      </div>
      <!--CQ分区图-->
      <div class="Maps_container" id="CQMaps">
        <div class="CQMaps">
          <div class="CQMaps_title">
            <h1>CQ分区图</h1>
            <button @click="downloadImage('../assets/CQ分区图.png')">
              <img :src="getIconPath('下载')">
              <p>下载原图</p>
            </button>
            <p>← 如需缩放查看细节，请点击下载原图</p>
          </div>
          <div class="CQMaps_img">
            <img src="../assets/CQ分区图.png" decoding="async" alt="CQ分区图"></img>
          </div>
        </div>
      </div>
      <!--中国业余无线电分区图-->
      <div class="Maps_container" id="ChinaCSMaps">
        <div class="CQMaps">
          <div class="CQMaps_title">
            <h1>中国业余无线电分区图</h1>
            <button @click="downloadImage('../assets/中国业余无线电分区图.jpg')">
              <img :src="getIconPath('下载')">
              <p>下载原图</p>
            </button>
            <p>← 如需缩放查看细节，请点击下载原图</p>
          </div>
          <div class="CQMaps_img">
            <img src="../assets/中国业余无线电分区图.jpg" decoding="async" alt="中国业余无线电分区图"></img>
          </div>
        </div>
      </div>
      <!--ITU分区图-->
      <div class="Maps_container" id="ITUMaps">
        <div class="CQMaps">
          <div class="CQMaps_title">
            <h1>ITU分区图</h1>
            <button @click="downloadImage('../assets/ITU分区图.jpg')">
              <img :src="getIconPath('下载')">
              <p>下载原图</p>
            </button>
            <p>← 如需缩放查看细节，请点击下载原图</p>
          </div>
          <div class="CQMaps_img">
            <img src="../assets/ITU分区图.jpg" decoding="async" alt="ITU分区图"></img>
          </div>
        </div>
      </div>
      <!--GRID地图-->
      <div class="Maps_container" id="GRIDMaps">
        <div class="GRIDMaps">
          <div class="GRIDMaps_title">
            <h1>GRID地图</h1>
          </div>
          <div class="GRIDMaps_img">
            <img src="../assets/网格地图1.gif" decoding="async" alt="GRID地图"></img>
            <img src="../assets/网格地图2.png" decoding="async" alt="GRID地图"></img>
          </div>
        </div>
      </div>
    </div>
    <!--底部-->
    <footer>
      <div class="footer">
        <div class="footer_left">
          <h1>&copy; 2025 HAM Desk 版权所有</h1>
          <p>数据均来源于网络，如有侵权请联系删除，联系邮箱：<a href="mailto:dormcraft@outlook.com">dormcraft@outlook.com</a></p>
        </div>
        <div class="footer_right">
          <button @click="scrollToTop">
            <img :src="getIconPath('顶部')">
          </button>
        </div>
      </div>
    </footer>

    <!--图像预览器-->
    <div class="Maps_Preview" v-if="isPreviewVisible">
      <div class="Mpasview">
        <div class="Mpasview_title">
          <h1>{{ previewTitle }}</h1>
          <button @click="closePreview"><img :src="getIconPath('close')"></img></button>
        </div>
        <div class="Mpasview_img">
          <img v-show="currentPreviewType === 'mufd'" src="https://prop.kc2g.com/renders/current/mufd-normal-now.svg"
            alt="MUF图" decoding="async">
          <img v-show="currentPreviewType === 'fof2'" src="https://prop.kc2g.com/renders/current/fof2-normal-now.svg"
            alt="foF2" decoding="async">
          <img v-show="currentPreviewType === 'uvmaps'" src="https://www.dxinfocentre.com/tr_map/fcst/eas006.png"
            alt="uvmaps" decoding="async">
        </div>
        <div class="Mapsview_content">
          <div class="MapsIntroduction_mufd" v-show="currentPreviewType === 'mufd'">
            <p>MUF图用色块和等高线把 “最大可用频率” 画成一张 “天空镜子反射能力图”。
              MUF的定义：在一条约 3000 km的单跳路径上，电离层还能把信号反射回来的最高频率。
              地图上的数值 ＝ 这段路径的 “天花板频率”。
              只要你想用的波段频率低于这个数，信号就能被 “天空镜子” 反射，完成DX；高于它，信号直接穿透电离层，跑向外太空。</p>
            <ul>
              <li>看色块快速判波段：</li>
              <li>深紫（MUF 6–9 MHz）→ 80 m、40 m、30 m 稳开</li>
              <li>蓝紫（MUF 9–12 MHz）→ 30 m 全天可用，20 m 早晚有机会</li>
              <li>蓝绿（MUF 12–18 MHz）→ 20 m 白天稳，17 m、15 m 可冲</li>
              <li>黄绿（MUF＞18 MHz）→ 15 m、12 m、10 m 可能全开</li>
            </ul>
            <p>多跳远程按 “最短板”：整条链路里最低的那段MUF才是门槛。
              距离远不足 3000 km或打高仰角时，镜子 “倾斜度” 变大，实际可用频率会比地图值低，选更低波段更保险；仰角接近垂直（NVIS）时，天花板直接降到临界频率 foF2，只剩 80 m、40 m 能用。</p>
            <b>总结：颜色越黄，能用越高；频率低于MUF，DX才有戏。</b>
          </div>
          <div class="MapsIntroduction_fof2" v-show="currentPreviewType === 'fof2'">
            <p>foF2 图与 MUF 图相似，展示了临界频率（foF2）。它给出了 NVIS（"自家后院" 用的天波通信）能用的最高频率。当 foF2 升到 7 MHz 以上时，40 m 波段 "变短"，可用于本地通联；若
              foF2 跌到 3 MHz 以下，80 m 波段 "变长"，本地台会消失，但远方电台仍可被接收到。</p>
          </div>
          <div class="MapsIntroduction_uvmaps" v-show="currentPreviewType === 'uvmaps'">
            <p>预报中提到的地区具有产生甚高频、超高频或微波无线电波对流层弯曲的必要大气条件。对流层弯曲使电台和电视台的范围远远超出了正常范围，业余无线电爱好者可以在UV段进行超远距离通联。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '../function/useTheme'
import { useHamMapsData } from '../function/useHamMapsData'
import { downloadImage } from '../function/useDownImage'
import { computed, ref } from 'vue'
const theme = useTheme()
// 引入HAM地图数据
const { d1, d2, d3, d4, n1, n2, n3, n4 } = useHamMapsData()
// 预览器状态变量
const isPreviewVisible = ref(false)
const currentPreviewType = ref<'mufd' | 'fof2' | 'uvmaps'>('mufd')
const previewTitle = ref('MUF 图')
// 中英文映射函数
const translateCondition = (condition: string): string => {
  const map: Record<string, string> = {
    'Poor': '较差',
    'Good': '良好',
    'Fair': '一般',
    'day': '白天',
    'night': '夜晚'
  }
  return map[condition] || condition
}
// 计算属性，自动转换显示文本
const displayD1 = computed(() => translateCondition(d1.value))
const displayD2 = computed(() => translateCondition(d2.value))
const displayD3 = computed(() => translateCondition(d3.value))
const displayD4 = computed(() => translateCondition(d4.value))
const displayN1 = computed(() => translateCondition(n1.value))
const displayN2 = computed(() => translateCondition(n2.value))
const displayN3 = computed(() => translateCondition(n3.value))
const displayN4 = computed(() => translateCondition(n4.value))
// 导入所有图标
const icons = {
  全屏: new URL('../assets/全屏.svg', import.meta.url).toString(),
  全屏_white: new URL('../assets/全屏_white.svg', import.meta.url).toString(),
  close: new URL('../assets/close.svg', import.meta.url).toString(),
  close_white: new URL('../assets/close_white.svg', import.meta.url).toString(),
  下载: new URL('../assets/下载.svg', import.meta.url).toString(),
  下载_white: new URL('../assets/下载_white.svg', import.meta.url).toString(),
  顶部: new URL('../assets/顶部.svg', import.meta.url).toString(),
  顶部_white: new URL('../assets/顶部_white.svg', import.meta.url).toString(),
}
// 根据当前主题动态获取图标路径
const getIconPath = (iconName: string) => {
  const iconKey = theme.theme.value === 'dark' ? `${iconName}_white` : iconName
  return (icons as Record<string, string>)[iconKey]
}
// 预览器控制函数
const openPreview = (type: 'mufd' | 'fof2' | 'uvmaps') => {
  currentPreviewType.value = type
  isPreviewVisible.value = true

  // 设置对应的标题
  switch (type) {
    case 'mufd':
      previewTitle.value = 'MUF 图'
      break
    case 'fof2':
      previewTitle.value = 'foF2 图'
      break
    case 'uvmaps':
      previewTitle.value = 'UV 图'
      break
  }
}
const closePreview = () => {
  isPreviewVisible.value = false
}
// 频率范围对照表
const rangeMap: Record<string, string> = {
  '80m-40m': '3.5-7 MHz',
  '30m-20m': '10.1-14 MHz',
  '17m-15m': '18.1-21 MHz',
  '12m-10m': '24.8-29 MHz'
}
// 当前悬停的是哪一格（'' 表示没有悬停）
const hoverKey = ref('')
function bandTitle(band: string) {
  return hoverKey.value === band ? rangeMap[band] : band
}
// 刷新地图
function refreshMaps() {
  window.location.reload()
}
// 滚动到顶部
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped lang="less">
@import '../style/mixins.less';
@import '../style/HamMaps.less';

.app {
  .bg-color();
  .text-color();
  width: 100vw !important;
  display: grid !important;
  justify-items: center !important;
  align-content: flex-start !important;
}

button {
  .bg-color();
  .text-color();
  background: none;
}
</style>
