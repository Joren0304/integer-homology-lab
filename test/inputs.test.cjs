"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {parse, getExample, serialize} = require("../dist/inputs.js");

test("parses signed decimal integers exactly with mixed and full-width separators", () => {
  const input = "\t+0001，-0000 90071992547409931234；\r\n-2\t+3,   4  ";
  assert.deepEqual(parse(input, 2, 3, "A"), [["1","0","90071992547409931234"], ["-2","3","4"]]);
  assert.deepEqual(parse("1,2;3 4",2,2), [["1","2"],["3","4"]]);
});

test("produces correctly shaped empty matrices, and rejects data for zero dimensions", () => {
  for (const [rows,cols,output] of [[0,0,[]],[0,2,[]],[2,0,[[],[]]]]) {
    assert.deepEqual(parse(" \n ",rows,cols), output);
    assert.equal(serialize(output), "");
    assert.throws(() => parse("0",rows,cols,"B"), /B/);
  }
});

test("rejects missing entries and wrong dimensions", () => {
  for (const value of [",1", "1,", "1, ,2", "1，，2", "1,\n2,"]) {
    assert.throws(() => parse(value, value.includes("\n") ? 2 : 1, 2), /空单元格/);
  }
  assert.throws(() => parse("",1,1,"B"), /B尚未填写/);
  assert.throws(() => parse("1\n\n2",3,1), /第 2 行为空/);
  assert.throws(() => parse("1 2;3",2,2,"A"), /A第 2 行需要 2 列/);
  assert.throws(() => parse("1\n2",1,2), /需要 1 行/);
  assert.throws(() => parse("1",-1,1), /非负整数/);
});

test("rejects nonintegers, expressions and nondecimal encodings", () => {
  for (const value of ["1/2","1.0","2e3","--3","0xff","Infinity","NaN"]) {
    assert.throws(() => parse(value,1,1,"A"), /A第 1 行第 1 列须为整数/);
  }
});

test("every example round-trips, has the declared shape and composes to zero", () => {
  for (const id of ["klein","rp2","torus","triangle","mixed","point"]) {
    const {A,B,m,n,p,...example} = getExample(id);
    assert.equal(example.id,id);
    for (const [matrix,rows,cols] of [[A,m,n],[B,n,p]]) {
      assert.equal(matrix.length,rows);
      assert.ok(matrix.every(row => row.length === cols));
      assert.deepEqual(parse(serialize(matrix),rows,cols), matrix.map(row => row.map(String)));
    }
    for (const row of A) {
      for (let j=0; j<p; j++) assert.equal(row.reduce((sum,entry,i) => sum+entry*B[i][j],0),0,id);
    }
  }
});

test("examples are fresh copies and unknown IDs are rejected", () => {
  getExample("klein").A[0][0] = 99;
  assert.equal(getExample("klein").A[0][0],0);
  assert.throws(() => getExample("constructor"), /未知/);
});
