/* eslint-disable */
import * as Router from 'expo-router'

export * from 'expo-router'

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams:
        | { pathname: Router.RelativePathString; params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownInputParams }
        | { pathname: `/`; params?: Router.UnknownInputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownInputParams }
        | {
            pathname: `${'/(auth)'}/school-select` | `/school-select`
            params?: Router.UnknownInputParams
          }
        | {
            pathname: `${'/(tabs)'}/attendance` | `/attendance`
            params?: Router.UnknownInputParams
          }
        | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)'}/scores` | `/scores`; params?: Router.UnknownInputParams }
        | { pathname: `/attendance/history`; params?: Router.UnknownInputParams }
        | {
            pathname: `/attendance/[classId]`
            params: Router.UnknownInputParams & { classId: string | number }
          }
        | {
            pathname: `/attendance/session/[classId]`
            params: Router.UnknownInputParams & { classId: string | number }
          }
        | {
            pathname: `/scores/[assessmentId]`
            params: Router.UnknownInputParams & { assessmentId: string | number }
          }
        | {
            pathname: `/scores/student/[studentId]`
            params: Router.UnknownInputParams & { studentId: string | number }
          }
      hrefOutputParams:
        | { pathname: Router.RelativePathString; params?: Router.UnknownOutputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownOutputParams }
        | { pathname: `/`; params?: Router.UnknownOutputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownOutputParams }
        | {
            pathname: `${'/(auth)'}/school-select` | `/school-select`
            params?: Router.UnknownOutputParams
          }
        | {
            pathname: `${'/(tabs)'}/attendance` | `/attendance`
            params?: Router.UnknownOutputParams
          }
        | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownOutputParams }
        | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownOutputParams }
        | { pathname: `${'/(tabs)'}/scores` | `/scores`; params?: Router.UnknownOutputParams }
        | { pathname: `/attendance/history`; params?: Router.UnknownOutputParams }
        | {
            pathname: `/attendance/[classId]`
            params: Router.UnknownOutputParams & { classId: string }
          }
        | {
            pathname: `/attendance/session/[classId]`
            params: Router.UnknownOutputParams & { classId: string }
          }
        | {
            pathname: `/scores/[assessmentId]`
            params: Router.UnknownOutputParams & { assessmentId: string }
          }
        | {
            pathname: `/scores/student/[studentId]`
            params: Router.UnknownOutputParams & { studentId: string }
          }
      href:
        | Router.RelativePathString
        | Router.ExternalPathString
        | `/${`?${string}` | `#${string}` | ''}`
        | `/_sitemap${`?${string}` | `#${string}` | ''}`
        | `${'/(auth)'}/login${`?${string}` | `#${string}` | ''}`
        | `/login${`?${string}` | `#${string}` | ''}`
        | `${'/(auth)'}/school-select${`?${string}` | `#${string}` | ''}`
        | `/school-select${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}/attendance${`?${string}` | `#${string}` | ''}`
        | `/attendance${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}${`?${string}` | `#${string}` | ''}`
        | `/${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}/profile${`?${string}` | `#${string}` | ''}`
        | `/profile${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}/scores${`?${string}` | `#${string}` | ''}`
        | `/scores${`?${string}` | `#${string}` | ''}`
        | `/attendance/history${`?${string}` | `#${string}` | ''}`
        | { pathname: Router.RelativePathString; params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownInputParams }
        | { pathname: `/`; params?: Router.UnknownInputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownInputParams }
        | {
            pathname: `${'/(auth)'}/school-select` | `/school-select`
            params?: Router.UnknownInputParams
          }
        | {
            pathname: `${'/(tabs)'}/attendance` | `/attendance`
            params?: Router.UnknownInputParams
          }
        | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)'}/scores` | `/scores`; params?: Router.UnknownInputParams }
        | { pathname: `/attendance/history`; params?: Router.UnknownInputParams }
        | `/attendance/${Router.SingleRoutePart<T>}`
        | `/attendance/session/${Router.SingleRoutePart<T>}`
        | `/scores/${Router.SingleRoutePart<T>}`
        | `/scores/student/${Router.SingleRoutePart<T>}`
        | {
            pathname: `/attendance/[classId]`
            params: Router.UnknownInputParams & { classId: string | number }
          }
        | {
            pathname: `/attendance/session/[classId]`
            params: Router.UnknownInputParams & { classId: string | number }
          }
        | {
            pathname: `/scores/[assessmentId]`
            params: Router.UnknownInputParams & { assessmentId: string | number }
          }
        | {
            pathname: `/scores/student/[studentId]`
            params: Router.UnknownInputParams & { studentId: string | number }
          }
    }
  }
}
