import React, { memo, useEffect, useState } from 'react';
import { request } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
require('../../utils/style.min.css');
require('./main.css');

async function getERData() {
  return await request(`/${(pluginId || '').replace('@odda-studio/', '')}/er-data`);
}

const HomePage = () => {
  const [error, setError] = useState();

  useEffect(() => {
    async function getData() {
      try {
        const res = await getERData();
      } catch (e) {
        setError(e);
      }
    }
    getData();
  }, []);

  return (
    <div style={{ padding: '25px 30px' }}>
      <div className="erc-header-title">
        <h1>Entity Relationship Chart</h1>
        <p>Displays Entity Relationship Diagram of all Strapi models, fields and relations.</p>
      </div>

      {error && (
        <div>
          <br />
          <h2>{error.toString()}</h2>
          <textarea rows={10} cols={200} disabled="disabled" style={{ fontSize: 10, fontFamily: 'Courier' }}>
            {error.stack}
          </textarea>
        </div>
      )}
      <div id='erd'></div>
    </div>
  );
};

export default memo(HomePage);
