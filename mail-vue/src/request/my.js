import http from '@/axios/index.js';

export function loginUserInfo() {
    return http.get('/my/loginUserInfo')
}

export function resetPassword(password, oldPassword) {
    return http.put('/my/resetPassword', {password, oldPassword})
}

export function userDelete() {
    return http.delete('/my/delete')
}

