/**
 * =====================================================
 * uni-app 页面集成示例 - Vue 页面
 * =====================================================
 * 
 * 展示如何在页面中使用统计功能
 */

// #ifdef VUE3
<template>
  <view class="container">
    <button @click="handleBuy" id="btn_buy">立即购买</button>
    <button @click="handlePay" id="btn_pay">去支付</button>
    <button @click="handleShare" id="btn_share">分享</button>
    
    <view class="product-list">
      <view 
        v-for="item in productList" 
        :key="item.id"
        :data-product-id="item.id"
        class="product-item"
        @click="handleProductClick(item)"
      >
        {{ item.name }} - ¥{{ item.price }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onShow, onHide } from 'vue';

// 使用分析 SDK
const $analytics = getApp().globalData.$analytics || {};

// 产品数据
const productList = ref([
    { id: 'P001', name: 'iPhone 15', price: 5999 },
    { id: 'P002', name: 'MacBook Pro', price: 12999 },
    { id: 'P003', name: 'AirPods Pro', price: 1899 }
]);

// 页面加载
onMounted(() => {
    // 页面浏览追踪（使用组合式 API）
    if ($analytics.trackPageView) {
        $analytics.trackPageView('/pages/product/list');
    }
    
    // 页面参数
    if (getApp().globalData.categoryId) {
        $analytics.track('page_view_with_param', {
            category_id: getApp().globalData.categoryId
        });
    }
});

// 页面显示
onShow(() => {
    console.log('Product list page shown');
});

// 页面隐藏
onHide(() => {
    console.log('Product list page hidden');
    // 触发数据上报
    if ($analytics.flush) {
        $analytics.flush();
    }
});

// 购买按钮点击
function handleBuy() {
    // 追踪点击
    if ($analytics.trackClick) {
        $analytics.trackClick('btn_buy', {
            button_text: '立即购买',
            page: '/pages/product/list'
        });
    }
    
    // 追踪自定义事件
    if ($analytics.track) {
        $analytics.track('purchase_button_click', {
            page: '/pages/product/list',
            timestamp: Date.now()
        });
    }
    
    // 跳转
    uni.navigateTo({
        url: '/pages/order/confirm'
    });
}

// 支付按钮点击
function handlePay() {
    if ($analytics.trackClick) {
        $analytics.trackClick('btn_pay', {
            button_text: '去支付',
            page: '/pages/product/list'
        });
    }
    
    uni.navigateTo({
        url: '/pages/order/pay'
    });
}

// 分享按钮点击
function handleShare() {
    if ($analytics.trackClick) {
        $analytics.trackClick('btn_share', {
            button_text: '分享',
            page: '/pages/product/list'
        });
    }
    
    // 追踪分享事件
    if ($analytics.track) {
        $analytics.track('share_action', {
            page: '/pages/product/list',
            share_method: 'button'
        });
    }
}

// 产品点击
function handleProductClick(product) {
    if ($analytics.trackClick) {
        $analytics.trackClick(`product_${product.id}`, {
            product_id: product.id,
            product_name: product.name,
            price: product.price,
            page: '/pages/product/list'
        });
    }
    
    // 追踪产品查看
    if ($analytics.track) {
        $analytics.track('product_view', {
            product_id: product.id,
            product_name: product.name,
            price: product.price
        });
    }
    
    uni.navigateTo({
        url: `/pages/product/detail?id=${product.id}`
    });
}

// 页面滚动追踪
function handleScroll(e) {
    const scrollTop = e.scrollTop;
    const scrollHeight = e.scrollHeight;
    const clientHeight = e.detail.clientHeight;
    
    // 计算滚动深度
    const scrollDepth = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
    
    if ($analytics.trackScroll) {
        $analytics.trackScroll({
            depth: scrollDepth,
            scroll_top: scrollTop,
            page: '/pages/product/list'
        });
    }
}
</script>

<style scoped>
.container {
    padding: 20rpx;
}

.product-list {
    margin-top: 20rpx;
}

.product-item {
    padding: 20rpx;
    border-bottom: 1rpx solid #eee;
}
</style>

// #endif

// #ifdef VUE2
<template>
  <view class="container">
    <button @click="handleBuy" id="btn_buy">立即购买</button>
    <button @click="handlePay" id="btn_pay">去支付</button>
    <button @click="handleShare" id="btn_share">分享</button>
    
    <view class="product-list">
      <view 
        v-for="item in productList" 
        :key="item.id"
        :data-product-id="item.id"
        class="product-item"
        @click="handleProductClick(item)"
      >
        {{ item.name }} - ¥{{ item.price }}
      </view>
    </view>
  </view>
</template>

<script>
export default {
    data() {
        return {
            productList: [
                { id: 'P001', name: 'iPhone 15', price: 5999 },
                { id: 'P002', name: 'MacBook Pro', price: 12999 },
                { id: 'P003', name: 'AirPods Pro', price: 1899 }
            ]
        };
    },
    
    onLoad() {
        // 页面浏览追踪
        this.$analytics.trackPageView('/pages/product/list');
    },
    
    onShow() {
        console.log('Product list page shown');
    },
    
    onHide() {
        console.log('Product list page hidden');
        this.$analytics.flush();
    },
    
    methods: {
        handleBuy() {
            // 追踪点击
            this.$analytics.trackClick('btn_buy', {
                button_text: '立即购买',
                page: '/pages/product/list'
            });
            
            // 追踪自定义事件
            this.$analytics.track('purchase_button_click', {
                page: '/pages/product/list',
                timestamp: Date.now()
            });
            
            uni.navigateTo({
                url: '/pages/order/confirm'
            });
        },
        
        handlePay() {
            this.$analytics.trackClick('btn_pay', {
                button_text: '去支付',
                page: '/pages/product/list'
            });
            
            uni.navigateTo({
                url: '/pages/order/pay'
            });
        },
        
        handleShare() {
            this.$analytics.trackClick('btn_share', {
                button_text: '分享',
                page: '/pages/product/list'
            });
            
            this.$analytics.track('share_action', {
                page: '/pages/product/list',
                share_method: 'button'
            });
        },
        
        handleProductClick(product) {
            this.$analytics.trackClick(`product_${product.id}`, {
                product_id: product.id,
                product_name: product.name,
                price: product.price,
                page: '/pages/product/list'
            });
            
            this.$analytics.track('product_view', {
                product_id: product.id,
                product_name: product.name,
                price: product.price
            });
            
            uni.navigateTo({
                url: `/pages/product/detail?id=${product.id}`
            });
        }
    }
};
</script>

<style scoped>
.container {
    padding: 20rpx;
}

.product-list {
    margin-top: 20rpx;
}

.product-item {
    padding: 20rpx;
    border-bottom: 1rpx solid #eee;
}
</style>

// #endif
