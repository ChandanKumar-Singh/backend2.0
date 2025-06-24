import mongoose from "mongoose";

export function mongoOne(arr) {
    if (!Array.isArray(arr)) return arr;
    if (arr.length > 0) {
        return arr[0];
    }
    return null;
}


export function mObj(id) {
    if (!id) return null;
    if (mongoValid(id)) return id instanceof mongoose.Types.ObjectId ? id : mongoose.Types.ObjectId(id);
    return null;
}

export function mEq(id1, id2) {
    if (id1 && id2) {
        return id1.toString() === id2.toString();
    } return false;
}

export function mongoValid(id) {
    return mongoose.Types.ObjectId.isValid(id);
}