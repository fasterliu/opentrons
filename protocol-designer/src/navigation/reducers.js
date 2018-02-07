// @flow
import { combineReducers } from 'redux'
import { handleActions } from 'redux-actions'
import type { ActionType } from 'redux-actions'

import type {BaseState} from '../types'
import {navigateToPage} from './actions'
import type {Page} from './types'

const page = handleActions({
  NAVIGATE_TO_PAGE: (state, action: ActionType<typeof navigateToPage>) => action.payload
}, 'file page')

export const _allReducers = {
  page
}

export type RootState = {page: Page}

const rootReducer = combineReducers(_allReducers)

export default rootReducer

const rootSelector = (state: BaseState) => state.navigation

export const selectors = {
  currentPage: (state: BaseState) => rootSelector(state).page
}
