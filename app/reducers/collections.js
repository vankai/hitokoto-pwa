import update from 'immutability-helper';
import {
  COLLECTIONS_FETCHED_FAILED,
  COLLECTIONS_FETCHED_SUCCESS,
  ENTER_COLLECTION,
  LEAVE_COLLECTION,
  FETCH_COLLECTION_HITO_SUCCESS,
  PUBLISH_COLLECTION_HITO_SUCCESS,
  REFRESH_COLLECTION_HITO_DONE,
  REMOVE_ONE_HITO_SUCCESS
} from '../actions'

const DEFAULT_COLLECTIONS = {
  data: [],
  hitokotos: [],
  editing: {},
  needRefreshHikotokos: false
}

const collection = (collections = DEFAULT_COLLECTIONS, action) => {
  switch (action.type) {
    case COLLECTIONS_FETCHED_SUCCESS:
      return update(collections, {
        data: {
          $set: action.value
        }
      });

    case LEAVE_COLLECTION:
      return update(collections, {
        hitokotos: {
          $set: []
        }
      })
    case PUBLISH_COLLECTION_HITO_SUCCESS:
      return update(collections, {
        needRefreshHikotokos: {
          $set: true
        }
      })
    case REFRESH_COLLECTION_HITO_DONE:
      return update(collections, {
        needRefreshHikotokos: {
          $set: false
        }
      })
    case FETCH_COLLECTION_HITO_SUCCESS:
      return update(collections, {
        hitokotos: {
          $set: action.value
        }
      })

    case REMOVE_ONE_HITO_SUCCESS:
      let index = collections.hitokotos.findIndex(item => item._id === action.value);
      if (~ index) {
        return update(collections, {
          hitokotos: {
            $splice: [
              [index, 1]
            ]
          }
        })
      } else {
        return collections
      }

    default:
      return collections;
  }
}
export default collection
